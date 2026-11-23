import { Prisma, PrismaClient } from '@prisma/client';

import type {
  IProgressRepository,
  StoredProgress,
} from '../../application/ports/progress-repository';
import type { GameId } from '../../domain/game/game-id';
import {
  type LevelResult,
  PlayerProgress,
} from '../../domain/progress/player-progress';
import { fromGameIdColumn, toGameIdColumn } from './game-id-column';

/** The only part of Prisma the repository needs; lets tests pass a fake. */
export type ProgressClient = Pick<
  PrismaClient,
  '$transaction' | 'playerProgress' | 'levelProgress'
>;

type ProgressTransaction = Pick<
  Prisma.TransactionClient,
  '$executeRaw' | 'playerProgress' | 'levelProgress'
>;

/**
 * Adapter: implements `IProgressRepository` on `player_progress` (one row
 * per user and game) and `level_progress` (one row per completed level).
 * The game of a level is read from `levels`, which `level_progress` points
 * to. The merge rule is the entity's; this class only loads and stores.
 */
export class PrismaProgressRepository implements IProgressRepository {
  constructor(private readonly client: ProgressClient) {}

  async findAll(userId: string): Promise<StoredProgress[]> {
    const [games, levels] = await Promise.all([
      this.client.playerProgress.findMany({ where: { userId } }),
      this.client.levelProgress.findMany({
        where: { userId },
        include: { level: { select: { gameId: true } } },
      }),
    ]);
    return games.map((game) => {
      const gameId = fromGameIdColumn(game.gameId);
      const results = levels
        .filter((row) => fromGameIdColumn(row.level.gameId) === gameId)
        .map(toLevelResult);
      return toStored(gameId, game.bestScore, results, game.updatedAt);
    });
  }

  /**
   * One transaction holding a lock named after the user and game: a second
   * sync of the same pair waits for the first to commit, then merges on top
   * of it, so no best result is lost. A row lock (`FOR UPDATE`) would not
   * do, because the first sync has no row to lock yet. Source: PostgreSQL
   * documentation, "Explicit Locking", section "Advisory Locks":
   * https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS
   */
  save(
    userId: string,
    gameId: GameId,
    change: (current: PlayerProgress | null) => PlayerProgress,
  ): Promise<StoredProgress> {
    return this.client.$transaction(async (tx: ProgressTransaction) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}::text || ':' || ${gameId}::text))`;
      const current = await load(tx, userId, gameId);
      const next = change(current?.progress ?? null);
      if (current && next.equals(current.progress)) {
        return current;
      }
      return store(tx, userId, next, current?.progress ?? null);
    });
  }
}

async function load(
  tx: ProgressTransaction,
  userId: string,
  gameId: GameId,
): Promise<StoredProgress | null> {
  const column = toGameIdColumn(gameId);
  const game = await tx.playerProgress.findUnique({
    where: { userId_gameId: { userId, gameId: column } },
  });
  if (!game) {
    return null;
  }
  const levels = await tx.levelProgress.findMany({
    where: { userId, level: { gameId: column } },
  });
  return toStored(
    gameId,
    game.bestScore,
    levels.map(toLevelResult),
    game.updatedAt,
  );
}

/**
 * Writes the game row on every change, so its `updatedAt` moves even when
 * only a level improved, then only the levels that are new or better.
 */
async function store(
  tx: ProgressTransaction,
  userId: string,
  progress: PlayerProgress,
  previous: PlayerProgress | null,
): Promise<StoredProgress> {
  const gameId = toGameIdColumn(progress.gameId);
  const game = await tx.playerProgress.upsert({
    where: { userId_gameId: { userId, gameId } },
    create: { userId, gameId, bestScore: progress.bestScore },
    update: { bestScore: progress.bestScore },
  });
  for (const level of changedLevels(progress, previous)) {
    const values = { bestScore: level.bestScore, stars: level.stars };
    await tx.levelProgress.upsert({
      where: { userId_levelId: { userId, levelId: level.levelId } },
      create: { userId, levelId: level.levelId, ...values },
      update: values,
    });
  }
  return { progress, updatedAt: game.updatedAt };
}

function changedLevels(
  progress: PlayerProgress,
  previous: PlayerProgress | null,
): LevelResult[] {
  const before = new Map(previous?.levels.map((l) => [l.levelId, l]));
  return progress.levels.filter((level) => {
    const old = before.get(level.levelId);
    return (
      !old || old.bestScore !== level.bestScore || old.stars !== level.stars
    );
  });
}

function toLevelResult(row: {
  levelId: string;
  bestScore: number;
  stars: number | null;
}): LevelResult {
  return { levelId: row.levelId, bestScore: row.bestScore, stars: row.stars };
}

/** Rebuilds the entity, so stored rows that break a rule are not hidden. */
function toStored(
  gameId: GameId,
  bestScore: number,
  levels: LevelResult[],
  updatedAt: Date,
): StoredProgress {
  return {
    progress: PlayerProgress.create({ gameId, bestScore, levels }),
    updatedAt,
  };
}
