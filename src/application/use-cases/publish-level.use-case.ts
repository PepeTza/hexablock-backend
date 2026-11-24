import { type GameId, isLevelGame } from '../../domain/game/game-id';
import { levelsUseSeed } from '../../domain/level/level-seed';
import type {
  LevelSpecValidators,
  LevelSpecViolation,
} from '../../domain/level/level-spec-validator';
import type { SeedConfig } from '../../domain/seed/seed-config';
import { ApplicationError } from '../errors/application-error';
import {
  GAME_WITHOUT_LEVELS_MESSAGE,
  SEED_CONFIG_NOT_ALLOWED_MESSAGE,
  SEED_CONFIG_REQUIRED_MESSAGE,
  unknownSchemaMessage,
} from '../errors/level-messages';
import type { ILevelCatalog, PublishedLevel } from '../ports/level-catalog';

export interface PublishLevelInput {
  /** The admin who publishes, already checked by the guards. */
  readonly publishedBy: string;
  /** The `gameId` of the path. */
  readonly gameId: GameId;
  readonly schemaVersion: number;
  readonly spec: Record<string, unknown>;
  readonly seedConfig: SeedConfig | null;
}

/**
 * CU-17: publishes a level at the end of its game's order. The server only
 * checks the format (api-contracts §6); whether the level can be won is
 * checked by the admin panel and the game (D-16).
 */
export class PublishLevelUseCase {
  constructor(
    private readonly catalog: ILevelCatalog,
    private readonly validators: LevelSpecValidators,
  ) {}

  async execute(input: PublishLevelInput): Promise<PublishedLevel> {
    const { gameId, schemaVersion, spec, seedConfig } = input;
    if (!isLevelGame(gameId)) {
      throw new ApplicationError('invalid', GAME_WITHOUT_LEVELS_MESSAGE);
    }
    if (levelsUseSeed(gameId) && seedConfig === null) {
      throw new ApplicationError('invalid', SEED_CONFIG_REQUIRED_MESSAGE);
    }
    if (!levelsUseSeed(gameId) && seedConfig !== null) {
      throw new ApplicationError('invalid', SEED_CONFIG_NOT_ALLOWED_MESSAGE);
    }
    const validator = this.validators.find(gameId, schemaVersion);
    if (validator === undefined) {
      throw new ApplicationError(
        'unprocessable',
        unknownSchemaMessage(schemaVersion),
      );
    }
    const violations = validator.validate(spec);
    if (violations.length > 0) {
      throw new ApplicationError('unprocessable', describe(violations));
    }
    return this.catalog.publish({ ...input });
  }
}

/** One message naming every broken field, e.g. `spec.goals must be ...`. */
function describe(violations: readonly LevelSpecViolation[]): string {
  return violations
    .map((violation) => `${violation.field} ${violation.issue}`)
    .join('; ');
}
