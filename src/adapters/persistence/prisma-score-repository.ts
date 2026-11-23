import { GameId as GameIdColumn, Prisma, PrismaClient } from '@prisma/client';

import type {
  IScoreRepository,
  ScoreOutcome,
  StoredSubmission,
} from '../../application/ports/score-repository';
import type { ScoreClaim } from '../../domain/score/score-claim';
import { toGameIdColumn } from './game-id-column';

/** The only part of Prisma the repository needs; lets tests pass a fake. */
export type ScoreClient = Pick<
  PrismaClient,
  '$transaction' | 'scoreSubmission' | 'leaderboardEntry'
>;

type ScoreTransaction = Pick<
  Prisma.TransactionClient,
  '$executeRaw' | 'scoreSubmission' | 'leaderboardEntry'
>;

type EntryReader = Pick<Prisma.TransactionClient, 'leaderboardEntry'>;

/** A leaderboard row, as far as ranking needs it. */
interface Entry {
  readonly gameId: GameIdColumn;
  readonly levelId: string | null;
  readonly bestScore: number;
  readonly achievedAt: Date;
}

/**
 * Adapter: implements `IScoreRepository` on `score_submissions` (every
 * submission, accepted or not) and `leaderboard_entries` (one row per player
 * and table, RN-43). The entries have partial unique indexes because
 * `level_id` can be null (data-model §5), so they are read and then created
 * or updated instead of using Prisma's `upsert`.
 */
export class PrismaScoreRepository implements IScoreRepository {
  constructor(private readonly client: ScoreClient) {}

  async findBySession(sessionId: string): Promise<StoredSubmission | null> {
    const submission = await this.client.scoreSubmission.findUnique({
      where: { sessionId },
    });
    if (!submission) {
      return null;
    }
    if (submission.status === 'rejected') {
      return { userId: submission.userId, status: 'rejected' };
    }
    const entry = await this.client.leaderboardEntry.findFirst({
      where: {
        userId: submission.userId,
        gameId: submission.gameId,
        levelId: submission.levelId,
      },
    });
    if (!entry) {
      throw new Error(`accepted submission ${sessionId} has no entry`);
    }
    // Still the player's best when the entry holds this very result.
    const personalBest =
      entry.bestScore === submission.score &&
      entry.achievedAt.getTime() === submission.finishedAt.getTime();
    return {
      userId: submission.userId,
      status: 'accepted',
      outcome: { personalBest, rank: await rankOf(this.client, entry) },
    };
  }

  async recordRejected(
    userId: string,
    sessionId: string,
    claim: ScoreClaim,
    reason: string,
  ): Promise<void> {
    try {
      await this.client.scoreSubmission.create({
        data: toSubmission(userId, sessionId, claim, 'rejected', reason),
      });
    } catch (error) {
      // A concurrent retry already logged it; the answer is the same.
      if (!isUniqueViolation(error)) {
        throw error;
      }
    }
  }

  /**
   * One transaction holding a lock named after the player and the table:
   * two scores of the same player for the same table never overwrite each
   * other's best (same technique as `PrismaProgressRepository.save`).
   */
  async recordAccepted(
    userId: string,
    sessionId: string,
    claim: ScoreClaim,
  ): Promise<ScoreOutcome | null> {
    const gameId = toGameIdColumn(claim.gameId);
    const table = `${userId}:${claim.gameId}:${claim.levelId ?? ''}`;
    try {
      return await this.client.$transaction(async (tx: ScoreTransaction) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${table}::text))`;
        await tx.scoreSubmission.create({
          data: toSubmission(userId, sessionId, claim, 'accepted', null),
        });
        const where = { userId, gameId, levelId: claim.levelId };
        const current = await tx.leaderboardEntry.findFirst({ where });
        const best = { bestScore: claim.score, achievedAt: claim.finishedAt };
        let entry: Entry;
        if (!current) {
          entry = await tx.leaderboardEntry.create({
            data: { ...where, ...best },
          });
        } else if (claim.score > current.bestScore) {
          // On a tie the earlier result keeps its place (RN-43).
          entry = await tx.leaderboardEntry.update({
            where: { id: current.id },
            data: best,
          });
        } else {
          entry = current;
        }
        return {
          personalBest: entry !== current,
          rank: await rankOf(tx, entry),
        };
      });
    } catch (error) {
      // The sessionId was stored meanwhile; the use case answers a retry.
      if (isUniqueViolation(error)) {
        return null;
      }
      throw error;
    }
  }
}

/** 1 + the entries of the same table that rank above (RN-43). */
async function rankOf(client: EntryReader, entry: Entry): Promise<number> {
  const above = await client.leaderboardEntry.count({
    where: {
      gameId: entry.gameId,
      levelId: entry.levelId,
      OR: [
        { bestScore: { gt: entry.bestScore } },
        { bestScore: entry.bestScore, achievedAt: { lt: entry.achievedAt } },
      ],
    },
  });
  return above + 1;
}

function toSubmission(
  userId: string,
  sessionId: string,
  claim: ScoreClaim,
  status: 'accepted' | 'rejected',
  rejectReason: string | null,
): Prisma.ScoreSubmissionUncheckedCreateInput {
  return {
    sessionId,
    userId,
    gameId: toGameIdColumn(claim.gameId),
    levelId: claim.levelId,
    score: claim.score,
    seed: claim.seed === null ? null : BigInt(claim.seed),
    moveCount: claim.moveCount,
    durationMs: claim.durationMs,
    finishedAt: claim.finishedAt,
    status,
    rejectReason,
  };
}

/** Prisma's error for a duplicate primary key (here, the `sessionId`). */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
