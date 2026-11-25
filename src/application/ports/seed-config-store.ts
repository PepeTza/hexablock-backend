import type { GameId } from '../../domain/game/game-id';
import type { SeedConfig } from '../../domain/seed/seed-config';

/** A seed config the admin saved, and when. */
export interface StoredSeedConfig {
  readonly config: SeedConfig;
  readonly updatedAt: Date;
}

/** A published level and its saved seed config, if any. */
export interface LevelSeedConfig {
  readonly levelId: string;
  readonly stored: StoredSeedConfig | null;
}

/**
 * Port: the seed configs of the games (RN-05, CU-15, CU-18). Kept apart from
 * the level ports, so each use case depends only on what it uses (ISP).
 */
export interface ISeedConfigStore {
  /** The config of a game kept per game, or `null` if never saved. */
  findForGame(gameId: GameId): Promise<StoredSeedConfig | null>;

  /** Every published level of `gameId` in level order, with its config. */
  listForLevels(gameId: GameId): Promise<LevelSeedConfig[]>;
}
