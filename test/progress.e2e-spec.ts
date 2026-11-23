import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { PrismaService } from '../src/frameworks/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// Every user this file creates starts with this prefix, so it can delete them.
const PREFIX = 'e2e_prog_';
const PASSWORD = 's3cretPass';

interface Player {
  readonly id: string;
  readonly token: string;
}

interface ProgressBody {
  readonly gameId: string;
  readonly bestScore: number;
  readonly levels: readonly {
    levelId: string;
    bestScore: number;
    stars: number | null;
  }[];
  readonly updatedAt: string;
}

/** A unique username for each player, within the 20-character limit. */
function uniqueName(): string {
  return `${PREFIX}${Math.random().toString(36).slice(2, 10)}`;
}

describe('Progress (e2e)', () => {
  let app: NestExpressApplication | undefined;
  let prisma: PrismaService;
  let fitLevel: string;
  let sortLevel: string;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    // The levels table is empty until #36 seeds it: publish two test levels.
    const publisher = await register();
    fitLevel = await publishLevel('hexa_fit', publisher.id);
    sortLevel = await publishLevel('hexa_sort', publisher.id);
  });

  afterEach(async () => {
    // If the app failed to start, let that error show instead of a new one.
    if (!app) {
      return;
    }
    const users = { user: { username: { startsWith: PREFIX } } };
    await prisma.levelProgress.deleteMany({ where: users });
    await prisma.playerProgress.deleteMany({ where: users });
    await prisma.level.deleteMany({
      where: { publisher: { username: { startsWith: PREFIX } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: PREFIX } },
    });
    await app.close();
    app = undefined;
  });

  function server(): ReturnType<NestExpressApplication['getHttpServer']> {
    if (!app) {
      throw new Error('The test app did not start');
    }
    return app.getHttpServer();
  }

  async function register(): Promise<Player> {
    const response = await request(server())
      .post('/api/v1/auth/register')
      .send({ username: uniqueName(), password: PASSWORD })
      .expect(201);
    const body = response.body as { accessToken: string; user: { id: string } };
    return { id: body.user.id, token: body.accessToken };
  }

  async function publishLevel(
    gameId: 'hexa_fit' | 'hexa_sort',
    publishedBy: string,
  ): Promise<string> {
    const level = await prisma.level.create({
      data: {
        gameId,
        // Far from any real level, and unique per test run.
        order: 1_000_000 + Math.floor(Math.random() * 1_000_000_000),
        schemaVersion: 1,
        spec: {},
        publishedBy,
      },
    });
    return level.id;
  }

  function sync(player: Player, gameId: string, body: object): request.Test {
    return request(server())
      .put(`/api/v1/progress/${gameId}`)
      .set('Authorization', `Bearer ${player.token}`)
      .send(body);
  }

  function list(player: Player): request.Test {
    return request(server())
      .get('/api/v1/progress')
      .set('Authorization', `Bearer ${player.token}`);
  }

  it('should_return_401_when_getting_progress_without_a_token', async () => {
    // Act
    const response = await request(server()).get('/api/v1/progress');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      message: 'invalid or expired token',
    });
  });

  it('should_return_an_empty_list_when_the_player_never_synced', async () => {
    // Arrange
    const player = await register();

    // Act
    const response = await list(player);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ progress: [] });
  });

  it('should_return_200_with_the_merged_progress_when_syncing_twice_with_different_bests', async () => {
    // Arrange: each device is better in one value of the same level.
    const player = await register();
    await sync(player, 'hexa-fit', {
      gameId: 'hexa-fit',
      bestScore: 0,
      levels: [{ levelId: fitLevel, bestScore: 1800, stars: 1 }],
    }).expect(200);

    // Act
    const response = await sync(player, 'hexa-fit', {
      gameId: 'hexa-fit',
      bestScore: 0,
      levels: [{ levelId: fitLevel, bestScore: 900, stars: 3 }],
    });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      gameId: 'hexa-fit',
      bestScore: 0,
      levels: [{ levelId: fitLevel, bestScore: 1800, stars: 3 }],
      updatedAt: expect.stringMatching(/Z$/) as string,
    });
    const listed = await list(player);
    expect((listed.body as { progress: ProgressBody[] }).progress).toEqual([
      response.body,
    ]);
  });

  it('should_return_the_same_body_when_the_same_progress_is_sent_twice', async () => {
    // Arrange
    const player = await register();
    const body = {
      gameId: 'hexa-sort',
      bestScore: 0,
      levels: [{ levelId: sortLevel, bestScore: 420 }],
    };
    const first = await sync(player, 'hexa-sort', body).expect(200);

    // Act: a retry of the offline queue.
    const second = await sync(player, 'hexa-sort', body);

    // Assert: same result, including the date.
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect((second.body as ProgressBody).levels).toEqual([
      { levelId: sortLevel, bestScore: 420, stars: null },
    ]);
  });

  it('should_keep_progress_separate_per_user', async () => {
    // Arrange
    const ana = await register();
    const beto = await register();
    await sync(ana, 'hexa-lines', {
      gameId: 'hexa-lines',
      bestScore: 900,
      levels: [],
    }).expect(200);

    // Act
    const response = await list(beto);

    // Assert
    expect(response.body).toEqual({ progress: [] });
  });

  it('should_keep_the_best_score_when_syncs_arrive_at_the_same_time', async () => {
    // Arrange: ten devices of one player sync different records at once.
    const player = await register();
    const scores = [120, 950, 40, 700, 310, 880, 15, 600, 499, 730];

    // Act
    const responses = await Promise.all(
      scores.map((bestScore) =>
        sync(player, 'hexa-merge', {
          gameId: 'hexa-merge',
          bestScore,
          levels: [],
        }),
      ),
    );

    // Assert: no sync overwrote a better one.
    expect(responses.every((response) => response.status === 200)).toBe(true);
    const listed = await list(player);
    expect((listed.body as { progress: ProgressBody[] }).progress).toEqual([
      expect.objectContaining({ gameId: 'hexa-merge', bestScore: 950 }),
    ]);
  });

  it('should_return_400_when_the_body_game_id_does_not_match_the_path', async () => {
    // Arrange
    const player = await register();

    // Act
    const response = await sync(player, 'hexa-merge', {
      gameId: 'hexa-lines',
      bestScore: 10,
      levels: [],
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: 'gameId in the body must match the path',
    });
  });

  it('should_return_400_when_a_level_id_is_unknown', async () => {
    // Arrange: a Hexa Sort level sent as a Hexa Fit one does not exist there.
    const player = await register();

    // Act
    const response = await sync(player, 'hexa-fit', {
      gameId: 'hexa-fit',
      bestScore: 0,
      levels: [{ levelId: sortLevel, bestScore: 100, stars: 2 }],
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: 'unknown levelId for this game',
    });
  });

  it('should_return_400_when_stars_are_sent_for_a_hexa_sort_level', async () => {
    // Arrange
    const player = await register();

    // Act
    const response = await sync(player, 'hexa-sort', {
      gameId: 'hexa-sort',
      bestScore: 0,
      levels: [{ levelId: sortLevel, bestScore: 100, stars: 2 }],
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: 'hexa-sort levels have no stars',
    });
  });

  it('should_return_400_when_the_path_game_id_is_unknown', async () => {
    // Arrange
    const player = await register();

    // Act
    const response = await sync(player, 'hexa-2048', {
      gameId: 'hexa-lines',
      bestScore: 10,
      levels: [],
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      details: [{ field: 'gameId', issue: 'in' }],
    });
  });

  it('should_return_400_with_details_when_a_level_field_is_malformed', async () => {
    // Arrange
    const player = await register();

    // Act
    const response = await sync(player, 'hexa-fit', {
      gameId: 'hexa-fit',
      bestScore: 0,
      levels: [{ levelId: 'not-a-uuid', bestScore: 100, stars: 2 }],
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      details: [{ field: 'levels.0.levelId', issue: 'uuid' }],
    });
  });
});
