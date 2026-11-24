import { Prisma, PrismaClient } from '@prisma/client';

import type {
  ILevelCatalog,
  NewLevel,
  PublishedLevel,
} from '../../application/ports/level-catalog';
import { fromGameIdColumn, toGameIdColumn } from './game-id-column';

/** The only part of Prisma the catalog needs. */
export type LevelCatalogClient = Pick<PrismaClient, '$transaction'>;

type CatalogTransaction = Pick<
  Prisma.TransactionClient,
  '$executeRaw' | 'level' | 'seedConfig'
>;

type LevelRow = Prisma.LevelGetPayload<object>;

/**
 * Adapter: implements `ILevelCatalog` on the `levels` and `seed_configs`
 * tables. Offers no update or delete (RN-37).
 */
export class PrismaLevelCatalog implements ILevelCatalog {
  constructor(private readonly client: LevelCatalogClient) {}

  /**
   * One transaction holding a lock named after the game: two admins
   * publishing at once wait for each other, so each gets its own
   * `last + 1` instead of hitting the unique `(game_id, order)` index (same
   * technique as `PrismaScoreRepository.recordAccepted`).
   */
  async publish(level: NewLevel): Promise<PublishedLevel> {
    const gameId = toGameIdColumn(level.gameId);
    const lock = `levels:${level.gameId}`;
    return this.client.$transaction(async (tx: CatalogTransaction) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lock}::text))`;
      const last = await tx.level.aggregate({
        where: { gameId },
        _max: { order: true },
      });
      const row = await tx.level.create({
        data: {
          gameId,
          order: (last._max.order ?? 0) + 1,
          schemaVersion: level.schemaVersion,
          spec: toJsonObject(level.spec),
          publishedBy: level.publishedBy,
        },
      });
      const seed = level.seedConfig;
      if (seed !== null) {
        await tx.seedConfig.create({
          data: {
            gameId,
            levelId: row.id,
            mode: seed.mode,
            value: seed.mode === 'fixed' ? BigInt(seed.value) : null,
            updatedBy: level.publishedBy,
          },
        });
      }
      return toPublishedLevel(row);
    });
  }
}

/** A `levels` row as the port's `PublishedLevel`. */
export function toPublishedLevel(row: LevelRow): PublishedLevel {
  return {
    id: row.id,
    gameId: fromGameIdColumn(row.gameId),
    order: row.order,
    schemaVersion: row.schemaVersion,
    spec: row.spec,
    publishedAt: row.publishedAt,
  };
}

/** The spec as Prisma's JSON input; it came from a parsed JSON body. */
function toJsonObject(spec: Record<string, unknown>): Prisma.InputJsonObject {
  if (!isJsonObject(spec)) {
    throw new Error('A level spec must be plain JSON');
  }
  return spec;
}

function isJsonObject(value: unknown): value is Prisma.InputJsonObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(isJsonValue)
  );
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return isJsonObject(value);
}
