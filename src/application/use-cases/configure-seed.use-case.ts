import type { GameId } from '../../domain/game/game-id';
import type { SeedConfig } from '../../domain/seed/seed-config';
import { seedScopeOf } from '../../domain/seed/seed-scope';
import { ApplicationError } from '../errors/application-error';
import { UNKNOWN_LEVEL_MESSAGE } from '../errors/progress-messages';
import {
  GAME_WITHOUT_SEED_MESSAGE,
  LEVEL_ID_NOT_ALLOWED_MESSAGE,
  LEVEL_ID_REQUIRED_MESSAGE,
} from '../errors/seed-messages';
import type { ILevelRepository } from '../ports/level-repository';
import type { ISeedConfigStore } from '../ports/seed-config-store';
import type { SeedConfigView } from './get-seed-config.use-case';

export interface ConfigureSeedInput {
  /** The admin who changes it, already checked by the guards. */
  readonly updatedBy: string;
  /** The `gameId` of the path. */
  readonly gameId: GameId;
  /** The `levelId` of the query, or `null` when absent. */
  readonly levelId: string | null;
  readonly config: SeedConfig;
}

/**
 * CU-18: an admin sets the seed config of a game, or of one Hexa Sort level.
 * Whether a `levelId` is needed follows the game's seed scope, never its
 * name. Returns the updated entry in the same shape as the `GET`.
 */
export class ConfigureSeedUseCase {
  constructor(
    private readonly store: ISeedConfigStore,
    private readonly levels: ILevelRepository,
  ) {}

  async execute(input: ConfigureSeedInput): Promise<SeedConfigView> {
    const { gameId, levelId, config, updatedBy } = input;
    switch (seedScopeOf(gameId)) {
      case 'game': {
        if (levelId !== null) {
          throw new ApplicationError('invalid', LEVEL_ID_NOT_ALLOWED_MESSAGE);
        }
        const entry = await this.store.save(
          { gameId, levelId: null },
          config,
          updatedBy,
        );
        return { scope: 'game', gameId, entry };
      }
      case 'level': {
        if (levelId === null) {
          throw new ApplicationError('invalid', LEVEL_ID_REQUIRED_MESSAGE);
        }
        await this.assertLevelExists(gameId, levelId);
        const entry = await this.store.save(
          { gameId, levelId },
          config,
          updatedBy,
        );
        return { scope: 'level', gameId, levels: [{ levelId, ...entry }] };
      }
      case null:
        throw new ApplicationError('invalid', GAME_WITHOUT_SEED_MESSAGE);
    }
  }

  /** Published levels are never deleted (RN-37), so checking first is safe. */
  private async assertLevelExists(
    gameId: GameId,
    levelId: string,
  ): Promise<void> {
    const existing = await this.levels.existingIds(gameId, [levelId]);
    if (!existing.has(levelId)) {
      throw new ApplicationError('not_found', UNKNOWN_LEVEL_MESSAGE);
    }
  }
}
