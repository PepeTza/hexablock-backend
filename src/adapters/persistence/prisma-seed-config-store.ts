import { Prisma, PrismaClient } from '@prisma/client';

import type {
  ISeedConfigStore,
  LevelSeedConfig,
  StoredSeedConfig,
} from '../../application/ports/seed-config-store';
import type { GameId } from '../../domain/game/game-id';
import type { SeedConfig } from '../../domain/seed/seed-config';
import { toGameIdColumn } from './game-id-column';

/** The only part of Prisma the store needs; lets tests pass a fake. */
export type SeedConfigClient = Pick<PrismaClient, 'seedConfig' | 'level'>;

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
}

/** A row as the port's type; `value` fits a number (32 bits, §7). */
export function toStored(row: SeedConfigRow): StoredSeedConfig {
  const config: SeedConfig =
    row.mode === 'fixed' && row.value !== null
      ? { mode: 'fixed', value: Number(row.value) }
      : { mode: 'random' };
  return { config, updatedAt: row.updatedAt };
}
