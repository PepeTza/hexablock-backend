import { type GameId, isLevelGame } from '../game/game-id';
import { levelsUseSeed } from '../level/level-seed';
import type { SeedConfig } from './seed-config';

/**
 * Where a game keeps its seed config: one for the whole game (Hexa Lines,
 * Hexa Merge), one per level (Hexa Sort), or none (Hexa Fit has no
 * randomness). Derived from the game's traits, never from its name.
 */
export type SeedScope = 'game' | 'level';

export function seedScopeOf(gameId: GameId): SeedScope | null {
  if (!isLevelGame(gameId)) {
    return 'game';
  }
  return levelsUseSeed(gameId) ? 'level' : null;
}

/** The config of a game or level the admin never configured (RN-05). */
export const DEFAULT_SEED_CONFIG: SeedConfig = { mode: 'random' };
