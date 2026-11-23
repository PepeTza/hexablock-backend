import { Prisma } from '@prisma/client';

import { ScoreClaim } from '../../domain/score/score-claim';
import {
  PrismaScoreRepository,
  type ScoreClient,
} from './prisma-score-repository';

const USER = '7f1c0000-0000-4000-8000-000000000001';
const SESSION = 'e3d1c2b4-0000-4000-8000-000000000001';
const EARLIER = new Date('2026-11-20T10:00:00Z');
const FINISHED = new Date('2026-11-23T12:00:00Z');

/** A Hexa Merge claim of 10 moves; only the score changes per test. */
function merge(score: number): ScoreClaim {
  return ScoreClaim.create({
    gameId: 'hexa-merge',
    levelId: null,
    score,
    seed: 42,
    moveCount: 10,
    durationMs: 60_000,
    finishedAt: FINISHED,
  });
}

function storedEntry(bestScore: number) {
  return {
    id: 'entry-1',
    userId: USER,
    gameId: 'hexa_merge',
    levelId: null,
    bestScore,
    achievedAt: EARLIER,
  };
}

/** Fake Prisma: the player's entry is `current`; 4 entries rank above. */
function fakePrisma(current: ReturnType<typeof storedEntry> | null) {
  const leaderboardEntry = {
    findFirst: jest.fn(() => Promise.resolve(current)),
    create: jest.fn((args: { data: object }) =>
      Promise.resolve({ id: 'entry-new', ...args.data }),
    ),
    update: jest.fn((args: { data: object }) =>
      Promise.resolve({ ...current, ...args.data }),
    ),
    count: jest.fn(() => Promise.resolve(4)),
  };
  const tx = {
    $executeRaw: jest.fn(() => Promise.resolve(1)),
    scoreSubmission: {
      create: jest.fn(() => Promise.resolve({})),
      findUnique: jest.fn(() => Promise.resolve(null)),
    },
    leaderboardEntry,
  };
  const client = {
    ...tx,
    $transaction: (work: (t: typeof tx) => Promise<unknown>) => work(tx),
  };
  return {
    tx,
    repository: new PrismaScoreRepository(client as unknown as ScoreClient),
  };
}

function duplicateKey(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('PrismaScoreRepository', () => {
  it('should_create_the_entry_when_the_player_has_none', async () => {
    // Arrange
    const { tx, repository } = fakePrisma(null);

    // Act
    const outcome = await repository.recordAccepted(USER, SESSION, merge(300));

    // Assert
    expect(outcome).toEqual({ personalBest: true, rank: 5 });
    expect(tx.leaderboardEntry.create).toHaveBeenCalledWith({
      data: {
        userId: USER,
        gameId: 'hexa_merge',
        levelId: null,
        bestScore: 300,
        achievedAt: FINISHED,
      },
    });
    expect(tx.scoreSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: SESSION,
        status: 'accepted',
        seed: BigInt(42),
      }) as object,
    });
  });

  it('should_update_the_entry_only_when_the_score_beats_the_best', async () => {
    // Arrange
    const lower = fakePrisma(storedEntry(500));
    const higher = fakePrisma(storedEntry(500));

    // Act
    const lowerOutcome = await lower.repository.recordAccepted(
      USER,
      SESSION,
      merge(300),
    );
    const higherOutcome = await higher.repository.recordAccepted(
      USER,
      SESSION,
      merge(700),
    );

    // Assert
    expect(lowerOutcome?.personalBest).toBe(false);
    expect(lower.tx.leaderboardEntry.update).not.toHaveBeenCalled();
    expect(higherOutcome?.personalBest).toBe(true);
    expect(higher.tx.leaderboardEntry.update).toHaveBeenCalledWith({
      where: { id: 'entry-1' },
      data: { bestScore: 700, achievedAt: FINISHED },
    });
  });

  it('should_keep_the_first_achievement_on_a_tie', async () => {
    // Arrange
    const { tx, repository } = fakePrisma(storedEntry(500));

    // Act
    const outcome = await repository.recordAccepted(USER, SESSION, merge(500));

    // Assert
    expect(outcome?.personalBest).toBe(false);
    expect(tx.leaderboardEntry.update).not.toHaveBeenCalled();
  });

  it('should_rank_by_score_and_then_by_earliest_achievement', async () => {
    // Arrange
    const { tx, repository } = fakePrisma(storedEntry(500));

    // Act
    await repository.recordAccepted(USER, SESSION, merge(300));

    // Assert
    expect(tx.leaderboardEntry.count).toHaveBeenCalledWith({
      where: {
        gameId: 'hexa_merge',
        levelId: null,
        OR: [
          { bestScore: { gt: 500 } },
          { bestScore: 500, achievedAt: { lt: EARLIER } },
        ],
      },
    });
  });

  it('should_take_an_advisory_lock_per_player_and_table', async () => {
    // Arrange
    const { tx, repository } = fakePrisma(null);

    // Act
    await repository.recordAccepted(USER, SESSION, merge(300));

    // Assert: the lock is the first statement, keyed by player and table.
    const [, key] = tx.$executeRaw.mock.calls[0] as unknown as [
      TemplateStringsArray,
      string,
    ];
    expect(key).toBe(`${USER}:hexa-merge:`);
    const [lockedAt] = tx.$executeRaw.mock.invocationCallOrder;
    const [insertedAt] = tx.scoreSubmission.create.mock.invocationCallOrder;
    expect(lockedAt).toBeLessThan(insertedAt ?? 0);
  });

  it('should_treat_a_duplicate_session_id_as_a_replay', async () => {
    // Arrange
    const { tx, repository } = fakePrisma(null);
    tx.scoreSubmission.create.mockRejectedValueOnce(duplicateKey());

    // Act
    const outcome = await repository.recordAccepted(USER, SESSION, merge(300));

    // Assert
    expect(outcome).toBeNull();
  });

  it('should_ignore_a_duplicate_when_logging_a_rejected_score', async () => {
    // Arrange
    const { tx, repository } = fakePrisma(null);
    tx.scoreSubmission.create.mockRejectedValueOnce(duplicateKey());

    // Act
    const act = repository.recordRejected(USER, SESSION, merge(9), 'too high');

    // Assert
    await expect(act).resolves.toBeUndefined();
  });

  it('should_report_the_current_outcome_when_finding_an_accepted_session', async () => {
    // Arrange: the stored submission is still the player's entry.
    const { tx, repository } = fakePrisma(storedEntry(500));
    tx.scoreSubmission.findUnique.mockResolvedValueOnce({
      userId: USER,
      status: 'accepted',
      gameId: 'hexa_merge',
      levelId: null,
      score: 500,
      finishedAt: EARLIER,
    } as never);

    // Act
    const stored = await repository.findBySession(SESSION);

    // Assert
    expect(stored).toEqual({
      userId: USER,
      status: 'accepted',
      outcome: { personalBest: true, rank: 5 },
    });
  });

  it('should_report_only_the_owner_when_finding_a_rejected_session', async () => {
    // Arrange
    const { tx, repository } = fakePrisma(null);
    tx.scoreSubmission.findUnique.mockResolvedValueOnce({
      userId: USER,
      status: 'rejected',
    } as never);

    // Act
    const stored = await repository.findBySession(SESSION);

    // Assert
    expect(stored).toEqual({ userId: USER, status: 'rejected' });
  });
});
