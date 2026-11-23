import { PrismaClient } from '@prisma/client';

import { ILevelRepository } from '../../application/ports/level-repository';
import type { GameId } from '../../domain/game/game-id';
import { toGameIdColumn } from './game-id-column';

/** The only part of Prisma the repository needs; lets tests pass a fake. */
export type LevelClient = Pick<PrismaClient, 'level'>;

/** Adapter: implements `ILevelRepository` on the `levels` table. */
export class PrismaLevelRepository implements ILevelRepository {
  constructor(private readonly client: LevelClient) {}

  async existingIds(
    gameId: GameId,
    levelIds: readonly string[],
  ): Promise<Set<string>> {
    const rows = await this.client.level.findMany({
      where: { id: { in: [...levelIds] }, gameId: toGameIdColumn(gameId) },
      select: { id: true },
    });
    return new Set(rows.map((row) => row.id));
  }
}
