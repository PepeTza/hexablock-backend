import type { GameId } from '../../domain/game/game-id';

/**
 * Port: the published levels (RN-37). For now it only answers which levels
 * exist; listing and publishing arrive with #34.
 */
export interface ILevelRepository {
  /** The ids among `levelIds` that are published levels of `gameId`. */
  existingIds(
    gameId: GameId,
    levelIds: readonly string[],
  ): Promise<Set<string>>;
}
