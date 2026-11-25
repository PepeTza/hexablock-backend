import type { NestExpressApplication } from '@nestjs/platform-express';
import type { SeedConfig as SeedConfigRow } from '@prisma/client';
import request from 'supertest';

import { PrismaSeedConfigStore } from '../src/adapters/persistence/prisma-seed-config-store';
import { PrismaService } from '../src/frameworks/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// Every user this file creates starts with this prefix, so it can delete them.
const PREFIX = 'e2e_seed_';
const PASSWORD = 's3cretPass';

interface Account {
  readonly id: string;
  readonly token: string;
}

interface LevelEntry {
  readonly levelId: string;
  readonly config: { mode: string; value?: number };
  readonly updatedAt: string | null;
}

function uniqueName(): string {
  return `${PREFIX}${Math.random().toString(36).slice(2, 10)}`;
}

describe('Seed config (e2e)', () => {
  let app: NestExpressApplication | undefined;
  let prisma: PrismaService;
  // Game-wide rows a test removed; put back after it so no other test or run
  // sees this file's data.
  let removedRows: SeedConfigRow[] = [];

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    if (!app) {
      return;
    }
    const byPrefix = { username: { startsWith: PREFIX } };
    await prisma.seedConfig.deleteMany({ where: { updater: byPrefix } });
    await prisma.level.deleteMany({ where: { publisher: byPrefix } });
    await prisma.user.deleteMany({ where: byPrefix });
    await prisma.seedConfig.createMany({ data: removedRows });
    removedRows = [];
    await app.close();
    app = undefined;
  });

  function server(): ReturnType<NestExpressApplication['getHttpServer']> {
    if (!app) {
      throw new Error('The test app did not start');
    }
    return app.getHttpServer();
  }

  async function register(): Promise<Account> {
    const response = await request(server())
      .post('/api/v1/auth/register')
      .send({ username: uniqueName(), password: PASSWORD })
      .expect(201);
    const body = response.body as { accessToken: string; user: { id: string } };
    return { id: body.user.id, token: body.accessToken };
  }

  async function registerAdmin(): Promise<Account> {
    const username = uniqueName();
    await request(server())
      .post('/api/v1/auth/register')
      .send({ username, password: PASSWORD })
      .expect(201);
    await prisma.user.update({ where: { username }, data: { role: 'admin' } });
    // Log in again so the token carries the new role.
    const response = await request(server())
      .post('/api/v1/auth/login')
      .send({ username, password: PASSWORD })
      .expect(200);
    const body = response.body as { accessToken: string; user: { id: string } };
    return { id: body.user.id, token: body.accessToken };
  }

  function configure(
    account: Account | null,
    path: string,
    body: object,
  ): request.Test {
    const call = request(server()).put(`/api/v1/seed-config/${path}`);
    return account
      ? call.set('Authorization', `Bearer ${account.token}`).send(body)
      : call.send(body);
  }

  /** Removes the game-wide row of `gameId`, to be restored after the test. */
  async function removeGameRow(gameId: 'hexa_lines' | 'hexa_merge') {
    const where = { gameId, levelId: null };
    removedRows.push(...(await prisma.seedConfig.findMany({ where })));
    await prisma.seedConfig.deleteMany({ where });
  }

  /** Far from any real level, and unique per test run. */
  function freeOrder(): number {
    return 1_000_000 + Math.floor(Math.random() * 1_000_000_000);
  }

  /** A Hexa Sort level stored directly, with or without a seed config. */
  async function sortLevel(
    publisher: Account,
    seed: { mode: 'fixed'; value: number } | null,
    order: number,
  ): Promise<string> {
    const level = await prisma.level.create({
      data: {
        gameId: 'hexa_sort',
        order,
        schemaVersion: 1,
        spec: {},
        publishedBy: publisher.id,
      },
    });
    if (seed !== null) {
      await prisma.seedConfig.create({
        data: {
          gameId: 'hexa_sort',
          levelId: level.id,
          mode: seed.mode,
          value: BigInt(seed.value),
          updatedBy: publisher.id,
        },
      });
    }
    return level.id;
  }

  it('should_return_the_default_random_with_null_updated_at_when_never_configured', async () => {
    // Arrange: start from no Merge config.
    await removeGameRow('hexa_merge');

    // Act: public, no token.
    const response = await request(server()).get(
      '/api/v1/seed-config/hexa-merge',
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      gameId: 'hexa-merge',
      config: { mode: 'random' },
      updatedAt: null,
    });
  });

  it('should_list_sort_levels_in_order_with_their_config_or_the_default', async () => {
    // Arrange
    const publisher = await register();
    // Inserted backwards, so the order must come from the query.
    const first = freeOrder();
    const unconfigured = await sortLevel(publisher, null, first + 1);
    const configured = await sortLevel(
      publisher,
      { mode: 'fixed', value: 42 },
      first,
    );

    // Act
    const response = await request(server()).get(
      '/api/v1/seed-config/hexa-sort',
    );

    // Assert
    expect(response.status).toBe(200);
    const { levels } = response.body as { levels: LevelEntry[] };
    const ids = levels.map((level) => level.levelId);
    expect(ids.indexOf(configured)).toBeLessThan(ids.indexOf(unconfigured));
    const byId = new Map(levels.map((level) => [level.levelId, level]));
    expect(byId.get(configured)).toMatchObject({
      config: { mode: 'fixed', value: 42 },
    });
    expect(byId.get(configured)?.updatedAt).not.toBeNull();
    expect(byId.get(unconfigured)).toEqual({
      levelId: unconfigured,
      config: { mode: 'random' },
      updatedAt: null,
    });
  });

  it.each([
    ['hexa-fit, which has no seed', 'hexa-fit'],
    ['an unknown game', 'tetris'],
  ])('should_return_400_when_reading_%s', async (_case, gameId) => {
    // Act
    const response = await request(server()).get(
      `/api/v1/seed-config/${gameId}`,
    );

    // Assert
    expect(response.status).toBe(400);
  });

  it('should_create_then_update_the_game_config_and_record_the_admin_when_an_admin_puts_it', async () => {
    // Arrange: start from no Lines config.
    await removeGameRow('hexa_lines');
    const admin = await registerAdmin();

    // Act
    const created = await configure(admin, 'hexa-lines', {
      mode: 'fixed',
      value: 4_294_967_295,
    });
    const updated = await configure(admin, 'hexa-lines', { mode: 'random' });
    const read = await request(server()).get('/api/v1/seed-config/hexa-lines');

    // Assert
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({
      gameId: 'hexa-lines',
      config: { mode: 'fixed', value: 4_294_967_295 },
    });
    expect(updated.status).toBe(200);
    expect(read.body).toEqual(updated.body);
    expect(updated.body).toMatchObject({ config: { mode: 'random' } });
    const rows = await prisma.seedConfig.findMany({
      where: { gameId: 'hexa_lines', levelId: null },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ updatedBy: admin.id, value: null });
  });

  it('should_return_only_the_changed_level_when_an_admin_puts_a_sort_level', async () => {
    // Arrange
    const admin = await registerAdmin();
    const levelId = await sortLevel(admin, null, freeOrder());

    // Act
    const response = await configure(admin, `hexa-sort?levelId=${levelId}`, {
      mode: 'fixed',
      value: 7,
    });

    // Assert
    expect(response.status).toBe(200);
    const body = response.body as { gameId: string; levels: LevelEntry[] };
    expect(body.gameId).toBe('hexa-sort');
    expect(body.levels).toHaveLength(1);
    expect(body.levels[0]).toMatchObject({
      levelId,
      config: { mode: 'fixed', value: 7 },
    });
    expect(body.levels[0]?.updatedAt).not.toBeNull();
  });

  it('should_keep_one_row_when_two_admins_save_the_same_level_at_once', async () => {
    // Arrange: straight on the adapter, so the saves overlap in the database
    // instead of being spaced out by the HTTP layer.
    const admin = await registerAdmin();
    const levelId = await sortLevel(admin, null, freeOrder());
    const store = new PrismaSeedConfigStore(prisma);

    // Act
    const saved = await Promise.allSettled(
      Array.from({ length: 8 }, (_unused, value) =>
        store.save(
          { gameId: 'hexa-sort', levelId },
          { mode: 'fixed', value },
          admin.id,
        ),
      ),
    );

    // Assert
    expect(saved.map((result) => result.status)).toEqual(
      Array(8).fill('fulfilled'),
    );
    expect(await prisma.seedConfig.count({ where: { levelId } })).toBe(1);
  });

  it('should_return_401_when_putting_without_a_token', async () => {
    // Act
    const response = await configure(null, 'hexa-lines', { mode: 'random' });

    // Assert
    expect(response.status).toBe(401);
  });

  it('should_return_403_when_a_player_puts_a_config', async () => {
    // Arrange
    const player = await register();

    // Act
    const response = await configure(player, 'hexa-lines', { mode: 'random' });

    // Assert
    expect(response.status).toBe(403);
  });

  it('should_report_an_unknown_mode_once_when_putting_a_config', async () => {
    // Arrange
    const admin = await registerAdmin();

    // Act
    const response = await configure(admin, 'hexa-lines', { mode: 'FIXED' });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      details: [{ field: 'mode', issue: 'in' }],
    });
  });

  it('should_return_404_when_the_sort_level_is_unknown', async () => {
    // Arrange
    const admin = await registerAdmin();

    // Act
    const response = await configure(
      admin,
      'hexa-sort?levelId=9c4e0000-0000-4000-8000-00000000dead',
      { mode: 'random' },
    );

    // Assert
    expect(response.status).toBe(404);
  });

  it.each<[string, string, object]>([
    ['random has a value', 'hexa-lines', { mode: 'random', value: 3 }],
    ['fixed has no value', 'hexa-lines', { mode: 'fixed' }],
    [
      'the value is over 32 bits',
      'hexa-lines',
      { mode: 'fixed', value: 2 ** 32 },
    ],
    ['the mode is unknown', 'hexa-lines', { mode: 'daily' }],
    ['hexa-sort has no levelId', 'hexa-sort', { mode: 'random' }],
    ['the levelId is not a uuid', 'hexa-sort?levelId=abc', { mode: 'random' }],
    [
      'hexa-merge has a levelId',
      'hexa-merge?levelId=9c4e0000-0000-4000-8000-000000000001',
      { mode: 'random' },
    ],
    ['the game is hexa-fit', 'hexa-fit', { mode: 'random' }],
  ])('should_return_400_when_%s', async (_case, path, body) => {
    // Arrange
    const admin = await registerAdmin();

    // Act
    const response = await configure(admin, path, body);

    // Assert
    expect(response.status).toBe(400);
  });
});
