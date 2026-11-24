import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { PrismaService } from '../src/frameworks/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// Every user this file creates starts with this prefix, so it can delete them.
const PREFIX = 'e2e_lvl_';
const PASSWORD = 's3cretPass';

interface Account {
  readonly id: string;
  readonly token: string;
}

interface LevelBody {
  readonly id: string;
  readonly gameId: string;
  readonly order: number;
  readonly schemaVersion: number;
  readonly spec: unknown;
  readonly publishedAt: string;
}

/** The JSON example of api-contracts §6. */
const SORT_SPEC = {
  radius: 2,
  blocked: [{ q: 0, r: 0 }],
  initialStacks: [{ cell: { q: 1, r: -1 }, chips: [0, 0, 1] }],
  colors: 4,
  tray: { size: 1, minHeight: 2, maxHeight: 6, maxColorsPerStack: 2 },
  goals: 5,
};

function uniqueName(): string {
  return `${PREFIX}${Math.random().toString(36).slice(2, 10)}`;
}

describe('Levels (e2e)', () => {
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

  /** An admin: there is no endpoint to promote users (#36), so set the row. */
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

  function publish(
    account: Account | null,
    gameId: string,
    body: object,
  ): request.Test {
    const call = request(server()).post(`/api/v1/levels/${gameId}`);
    return account
      ? call.set('Authorization', `Bearer ${account.token}`).send(body)
      : call.send(body);
  }

  const validBody = {
    schemaVersion: 1,
    spec: SORT_SPEC,
    seedConfig: { mode: 'fixed', value: 4294967295 },
  };

  it('should_return_201_with_the_level_and_store_its_seed_when_an_admin_publishes', async () => {
    // Arrange
    const admin = await registerAdmin();

    // Act
    const response = await publish(admin, 'hexa-sort', validBody);

    // Assert
    expect(response.status).toBe(201);
    const level = response.body as LevelBody;
    expect(level).toMatchObject({
      gameId: 'hexa-sort',
      schemaVersion: 1,
      spec: SORT_SPEC,
    });
    expect(Number.isInteger(level.order)).toBe(true);
    expect(Number.isNaN(Date.parse(level.publishedAt))).toBe(false);
    const seed = await prisma.seedConfig.findFirst({
      where: { levelId: level.id },
    });
    expect(seed).toMatchObject({ mode: 'fixed', value: 4294967295n });
  });

  it('should_return_401_when_publishing_without_a_token', async () => {
    // Act
    const response = await publish(null, 'hexa-sort', validBody);

    // Assert
    expect(response.status).toBe(401);
  });

  it('should_return_403_when_a_player_publishes', async () => {
    // Arrange
    const player = await register();

    // Act
    const response = await publish(player, 'hexa-sort', validBody);

    // Assert
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ message: 'insufficient role' });
  });

  it.each([
    ['an endless game', 'hexa-lines', validBody],
    [
      'a missing seedConfig',
      'hexa-sort',
      { schemaVersion: 1, spec: SORT_SPEC },
    ],
    [
      'a random seed with a value',
      'hexa-sort',
      { ...validBody, seedConfig: { mode: 'random', value: 3 } },
    ],
    [
      'a seed above 32 bits',
      'hexa-sort',
      { ...validBody, seedConfig: { mode: 'fixed', value: 4294967296 } },
    ],
    ['an unknown body field', 'hexa-sort', { ...validBody, theme: 'dark' }],
    ['a non-object spec', 'hexa-sort', { ...validBody, spec: [1] }],
  ])('should_return_400_when_the_body_has_%s', async (_case, gameId, body) => {
    // Arrange
    const admin = await registerAdmin();

    // Act
    const response = await publish(admin, gameId, body);

    // Assert
    expect(response.status).toBe(400);
  });

  it('should_return_422_naming_the_field_when_the_spec_breaks_a_rule', async () => {
    // Arrange
    const admin = await registerAdmin();
    const spec = { ...SORT_SPEC, blocked: [{ q: 2, r: 1 }] };

    // Act
    const response = await publish(admin, 'hexa-sort', { ...validBody, spec });

    // Assert
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      message: 'spec.blocked[0] is outside the board',
    });
  });

  it('should_return_422_when_hexa_fit_has_no_validator_yet', async () => {
    // Arrange
    const admin = await registerAdmin();

    // Act
    const response = await publish(admin, 'hexa-fit', {
      schemaVersion: 1,
      spec: { pieces: [] },
    });

    // Assert
    expect(response.status).toBe(422);
  });

  it('should_assign_distinct_consecutive_orders_when_admins_publish_at_once', async () => {
    // Arrange
    const admin = await registerAdmin();

    // Act
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => publish(admin, 'hexa-sort', validBody)),
    );

    // Assert
    expect(responses.map((response) => response.status)).toEqual(
      Array(5).fill(201),
    );
    const orders = responses
      .map((response) => (response.body as LevelBody).order)
      .sort((a, b) => a - b);
    const first = orders[0] ?? 0;
    expect(orders).toEqual([first, first + 1, first + 2, first + 3, first + 4]);
  });

  it('should_list_the_levels_after_an_order_sorted_without_a_token', async () => {
    // Arrange: three levels published in a row get consecutive orders.
    const admin = await registerAdmin();
    const published: LevelBody[] = [];
    for (let i = 0; i < 3; i++) {
      const response = await publish(admin, 'hexa-sort', validBody);
      published.push(response.body as LevelBody);
    }
    const first = published[0]?.order ?? 0;

    // Act
    const response = await request(server()).get(
      `/api/v1/levels/hexa-sort?after=${first}`,
    );

    // Assert
    expect(response.status).toBe(200);
    const { levels } = response.body as { levels: LevelBody[] };
    expect(levels.map((found) => found.id)).toEqual(
      published.slice(1).map((level) => level.id),
    );
    expect(levels[0]).toEqual(published[1]);
  });

  it('should_return_every_level_when_after_is_missing', async () => {
    // Arrange
    const admin = await registerAdmin();
    const created = await publish(admin, 'hexa-sort', validBody);

    // Act
    const response = await request(server()).get('/api/v1/levels/hexa-sort');

    // Assert
    expect(response.status).toBe(200);
    const { levels } = response.body as { levels: LevelBody[] };
    expect(levels.map((found) => found.id)).toContain(
      (created.body as LevelBody).id,
    );
    const orders = levels.map((found) => found.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it.each([
    ['a decimal after', '/api/v1/levels/hexa-sort?after=1.5'],
    ['a text after', '/api/v1/levels/hexa-sort?after=abc'],
    ['a negative after', '/api/v1/levels/hexa-sort?after=-1'],
    ['an endless game', '/api/v1/levels/hexa-merge'],
    ['an unknown game', '/api/v1/levels/tetris'],
  ])('should_return_400_when_listing_with_%s', async (_case, url) => {
    // Act
    const response = await request(server()).get(url);

    // Assert
    expect(response.status).toBe(400);
  });
});
