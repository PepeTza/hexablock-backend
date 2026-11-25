import type { GameId } from '../../domain/game/game-id';
import type { SeedConfig } from '../../domain/seed/seed-config';
import { DEFAULT_SEED_CONFIG, seedScopeOf } from '../../domain/seed/seed-scope';
import { ApplicationError } from '../errors/application-error';
import { GAME_WITHOUT_SEED_MESSAGE } from '../errors/seed-messages';
import type {
  ISeedConfigStore,
  StoredSeedConfig,
} from '../ports/seed-config-store';

/** A config as the clients see it: `updatedAt` is `null` if never saved. */
export interface SeedConfigEntry {
  readonly config: SeedConfig;
  readonly updatedAt: Date | null;
}

export interface LevelSeedConfigEntry extends SeedConfigEntry {
  readonly levelId: string;
}

/** The seed configs of a game, in the shape its scope uses (api §7). */
export type SeedConfigView =
  | {
      readonly scope: 'game';
      readonly gameId: GameId;
      readonly entry: SeedConfigEntry;
    }
  | {
      readonly scope: 'level';
      readonly gameId: GameId;
      readonly levels: readonly LevelSeedConfigEntry[];
    };

/**
 * CU-15: the seed config a device uses for its next games. What was never
 * configured gets the default random mode (RN-05).
 */
export class GetSeedConfigUseCase {
  constructor(private readonly store: ISeedConfigStore) {}

  async execute(gameId: GameId): Promise<SeedConfigView> {
    switch (seedScopeOf(gameId)) {
      case 'game':
        return {
          scope: 'game',
          gameId,
          entry: entryOf(await this.store.findForGame(gameId)),
        };
      case 'level': {
        const levels = await this.store.listForLevels(gameId);
        return {
          scope: 'level',
          gameId,
          levels: levels.map(({ levelId, stored }) => ({
            levelId,
            ...entryOf(stored),
          })),
        };
      }
      case null:
        throw new ApplicationError('invalid', GAME_WITHOUT_SEED_MESSAGE);
    }
  }
}

/** The saved config, or the default one with no date. */
export function entryOf(stored: StoredSeedConfig | null): SeedConfigEntry {
  return stored ?? { config: DEFAULT_SEED_CONFIG, updatedAt: null };
}
