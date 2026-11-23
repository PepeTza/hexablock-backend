import { randomUUID } from 'node:crypto';

import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { PrismaService } from '../src/frameworks/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// Every user this file creates starts with this prefix, so it can delete them.
const PREFIX = 'e2e_score_';
const PASSWORD = 's3cretPass';

interface Player {
  readonly id: string;
  readonly token: string;
}

/** A unique username for each player, within the 20-character limit. */
function uniqueName(): string {
  return `${PREFIX}${Math.random().toString(36).slice(2, 10)}`;
}

describe('Scores (e2e)', () => {
  let app: NestExpressApplication | undefined;
  let prisma: PrismaService;
  let sortLevel: string;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    // A level of this run only, so its leaderboard holds only these players.
    const publisher = await register();
    sortLevel = await publishSortLevel(publisher.id);
  });

  afterEach(async () => {
    // If the app failed to start, let that error show instead of a new one.
    if (!app) {
      return;
    }
    const users = { user: { username: { startsWith: PREFIX } } };
    await prisma.scoreSubmission.deleteMany({ where: users });
    await prisma.leaderboardEntry.deleteMany({ where: users });
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

  async function publishSortLevel(publishedBy: string): Promise<string> {
    const level = await prisma.level.create({
      data: {
        gameId: 'hexa_sort',
        // Far from any real level, and unique per test run.
        order: 1_000_000 + Math.floor(Math.random() * 1_000_000_000),
        schemaVersion: 1,
        spec: {},
        publishedBy,
      },
    });
    return level.id;
  }

  /** A plausible Hexa Sort score of 10 moves on this run's level. */
  function sortScore(score: number, overrides: object = {}): object {
    return {
      sessionId: randomUUID(),
      gameId: 'hexa-sort',
      levelId: sortLevel,
      score,
      seed: 1739201,
      moveCount: 10,
      durationMs: 60_000,
      finishedAt: '2026-11-23T12:00:00Z',
      ...overrides,
    };
  }

  function submit(player: Player, body: object): request.Test {
    return request(server())
      .post('/api/v1/scores')
      .set('Authorization', `Bearer ${player.token}`)
      .send(body);
  }

  it('should_return_401_without_a_token', async () => {
    // Act
    const response = await request(server())
      .post('/api/v1/scores')
      .send(sortScore(100));

    // Assert
    expect(response.status).toBe(401);
  });

  it('should_return_201_with_the_rank_when_the_first_score_is_sent', async () => {
    // Arrange
    const player = await register();

    // Act
    const response = await submit(player, sortScore(420));

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      accepted: true,
      personalBest: true,
      rank: 1,
    });
  });

  it('should_return_200_with_the_same_body_when_the_session_is_resent', async () => {
    // Arrange
    const player = await register();
    const body = sortScore(420);
    const first = await submit(player, body).expect(201);

    // Act: a retry of the offline queue.
    const retry = await submit(player, body);

    // Assert
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual(first.body);
    expect(
      await prisma.scoreSubmission.count({ where: { userId: player.id } }),
    ).toBe(1);
  });

  it('should_return_422_and_not_rank_when_the_score_is_implausible', async () => {
    // Arrange: far above the Hexa Sort bound for 10 moves (4959).
    const player = await register();

    // Act
    const response = await submit(player, sortScore(99_999));

    // Assert: logged as rejected, with no leaderboard entry.
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ message: 'implausible score' });
    const stored = await prisma.scoreSubmission.findMany({
      where: { userId: player.id },
    });
    expect(stored).toEqual([
      expect.objectContaining({
        status: 'rejected',
        rejectReason: 'score above 4959 for 10 moves',
      }),
    ]);
    expect(
      await prisma.leaderboardEntry.count({ where: { userId: player.id } }),
    ).toBe(0);
  });

  it('should_return_400_when_an_endless_game_sends_a_level_id', async () => {
    // Arrange
    const player = await register();

    // Act
    const response = await submit(
      player,
      sortScore(100, { gameId: 'hexa-lines' }),
    );

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: 'levelId must be null in hexa-lines',
    });
  });

  it('should_return_400_when_a_level_game_has_no_level_id', async () => {
    // Arrange
    const player = await register();

    // Act
    const response = await submit(player, sortScore(100, { levelId: null }));

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: 'levelId is required in hexa-sort',
    });
  });

  it('should_return_400_when_the_level_is_unknown', async () => {
    // Arrange: this run's Hexa Sort level sent as a Hexa Fit one.
    const player = await register();

    // Act
    const response = await submit(
      player,
      sortScore(100, { gameId: 'hexa-fit', seed: null }),
    );

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: 'unknown levelId for this game',
    });
  });

  it('should_report_no_personal_best_when_the_score_is_lower', async () => {
    // Arrange
    const player = await register();
    await submit(player, sortScore(800)).expect(201);

    // Act
    const response = await submit(player, sortScore(300));

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      accepted: true,
      personalBest: false,
      rank: 1,
    });
  });

  it('should_rank_two_players_by_score', async () => {
    // Arrange
    const ana = await register();
    const beto = await register();
    await submit(ana, sortScore(500)).expect(201);

    // Act
    const response = await submit(beto, sortScore(700));

    // Assert: Beto passes Ana.
    expect(response.body).toMatchObject({ personalBest: true, rank: 1 });
    const anaRetry = await submit(ana, sortScore(100));
    expect(anaRetry.body).toMatchObject({ personalBest: false, rank: 2 });
  });

  it('should_keep_the_best_score_when_scores_arrive_at_the_same_time', async () => {
    // Arrange: ten games of one player reach the server at once.
    const player = await register();
    const scores = [120, 950, 40, 700, 310, 880, 15, 600, 499, 730];

    // Act
    const responses = await Promise.all(
      scores.map((score) => submit(player, sortScore(score))),
    );

    // Assert: one entry, holding the best score.
    expect(responses.every((response) => response.status === 201)).toBe(true);
    const entries = await prisma.leaderboardEntry.findMany({
      where: { userId: player.id },
    });
    expect(entries.map((entry) => entry.bestScore)).toEqual([950]);
  });

  it('should_return_429_after_30_submissions_in_a_minute', async () => {
    // Arrange
    const player = await register();
    for (let sent = 0; sent < 30; sent += 1) {
      await submit(player, sortScore(sent)).expect(201);
    }

    // Act
    const response = await submit(player, sortScore(31));

    // Assert
    expect(response.status).toBe(429);
  });
});
