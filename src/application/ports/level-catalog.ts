import type { GameId } from '../../domain/game/game-id';
import type { SeedConfig } from '../../domain/seed/seed-config';

/** A level ready to publish: its format was already checked. */
export interface NewLevel {
  readonly gameId: GameId;
  readonly schemaVersion: number;
  readonly spec: Record<string, unknown>;
  /** Present exactly for the games whose levels use a seed. */
  readonly seedConfig: SeedConfig | null;
  /** The admin who publishes it. */
  readonly publishedBy: string;
}

/** The `LevelDefinition` of api-contracts §6. */
export interface PublishedLevel {
  readonly id: string;
  readonly gameId: GameId;
  readonly order: number;
  readonly schemaVersion: number;
  readonly spec: unknown;
  readonly publishedAt: Date;
}

/**
 * Port: the level catalog (CU-15, CU-17). It only appends; there is no
 * operation to update or delete a level (RN-37). Kept apart from
 * `ILevelRepository`, so progress and scores depend only on what they use
 * (ISP).
 */
export interface ILevelCatalog {
  /**
   * Appends the level at `order = last + 1` of its game, together with its
   * seed config, atomically.
   */
  publish(level: NewLevel): Promise<PublishedLevel>;
}
