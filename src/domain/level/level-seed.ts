import type { GameId } from '../game/game-id';

// Hexa Sort levels draw their tray from a seed; Hexa Fit levels have none
// (RN-05, data-model `SeedConfig`).
const SEEDED_LEVEL_GAMES: readonly GameId[] = ['hexa-sort'];

/** `true` when every level of this game is published with a seed config. */
export function levelsUseSeed(gameId: GameId): boolean {
  return SEEDED_LEVEL_GAMES.includes(gameId);
}
