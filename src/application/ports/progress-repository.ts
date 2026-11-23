import type { GameId } from '../../domain/game/game-id';
import type { PlayerProgress } from '../../domain/progress/player-progress';

/** A progress as stored, with the moment the server last changed it. */
export interface StoredProgress {
  readonly progress: PlayerProgress;
  readonly updatedAt: Date;
}

/**
 * Port: where each player's progress is stored, one entry per user and
 * `gameId` (RN-33). The Prisma adapter implements it (DIP).
 */
export interface IProgressRepository {
  /** Every game the player has synced; games never synced are left out. */
  findAll(userId: string): Promise<StoredProgress[]>;
  /**
   * Reads the stored progress (or `null`), passes it to `change` and stores
   * what it returns, all as one atomic step: two syncs of the same player
   * and game never overwrite each other. Writes nothing when the result
   * equals what was stored, so a retry keeps `updatedAt`.
   */
  save(
    userId: string,
    gameId: GameId,
    change: (current: PlayerProgress | null) => PlayerProgress,
  ): Promise<StoredProgress>;
}
