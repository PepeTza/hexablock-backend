import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

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
    // Arrange: the disposable test database; start from no Merge config.
    await prisma.seedConfig.deleteMany({
      where: { gameId: 'hexa_merge', levelId: null },
    });

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
    // Far from any real level, and unique per test run; inserted backwards.
    const first = 1_000_000 + Math.floor(Math.random() * 1_000_000_000);
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
});
