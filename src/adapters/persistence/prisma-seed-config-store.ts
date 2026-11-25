import { Prisma, PrismaClient } from '@prisma/client';

import type {
  ISeedConfigStore,
  LevelSeedConfig,
  SeedTarget,
  StoredSeedConfig,
} from '../../application/ports/seed-config-store';
import type { GameId } from '../../domain/game/game-id';
import type { SeedConfig } from '../../domain/seed/seed-config';
import { toGameIdColumn } from './game-id-column';

/** The only part of Prisma the store needs; lets tests pass a fake. */
export type SeedConfigClient = Pick<
  PrismaClient,
  '$transaction' | 'seedConfig' | 'level'
>;

type SeedTransaction = Pick<
  Prisma.TransactionClient,
  '$executeRaw' | 'seedConfig'
>;

type SeedConfigRow = Prisma.SeedConfigGetPayload<object>;

/** Adapter: implements `ISeedConfigStore` on the `seed_configs` table. */
export class PrismaSeedConfigStore implements ISeedConfigStore {
  constructor(private readonly client: SeedConfigClient) {}

  async findForGame(gameId: GameId): Promise<StoredSeedConfig | null> {
    const row = await this.client.seedConfig.findFirst({
      where: { gameId: toGameIdColumn(gameId), levelId: null },
    });
    return row === null ? null : toStored(row);
  }

  async listForLevels(gameId: GameId): Promise<LevelSeedConfig[]> {
    const levels = await this.client.level.findMany({
      where: { gameId: toGameIdColumn(gameId) },
      orderBy: { order: 'asc' },
      // At most one per level: a partial unique index (data-model §5).
      select: { id: true, seedConfigs: { take: 1 } },
    });
    return levels.map((level) => {
      const [row] = level.seedConfigs;
      return { levelId: level.id, stored: row ? toStored(row) : null };
    });
  }

  /**
   * One transaction holding a lock named after the target: two admins saving
   * at once wait for each other, so the second updates the row the first
   * created instead of hitting the partial unique index. Prisma's `upsert`
   * cannot target partial indexes, so the row is read first (same technique
   * as `PrismaScoreRepository.recordAccepted`).
   */
  async save(
    target: SeedTarget,
    config: SeedConfig,
    updatedBy: string,
  ): Promise<StoredSeedConfig> {
    const gameId = toGameIdColumn(target.gameId);
    const lock = `seed:${target.gameId}:${target.levelId ?? ''}`;
    const data = {
      mode: config.mode,
      value: config.mode === 'fixed' ? BigInt(config.value) : null,
      updatedBy,
    };
    return this.client.$transaction(async (tx: SeedTransaction) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lock}::text))`;
      const current = await tx.seedConfig.findFirst({
        where: { gameId, levelId: target.levelId },
      });
      const row = current
        ? await tx.seedConfig.update({ where: { id: current.id }, data })
        : await tx.seedConfig.create({
            data: { ...data, gameId, levelId: target.levelId },
          });
      return toStored(row);
    });
  }
}

/** A row as the port's type; `value` fits a number (32 bits, §7). */
export function toStored(row: SeedConfigRow): StoredSeedConfig {
  const config: SeedConfig =
    row.mode === 'fixed' && row.value !== null
      ? { mode: 'fixed', value: Number(row.value) }
      : { mode: 'random' };
  return { config, updatedAt: row.updatedAt };
}
