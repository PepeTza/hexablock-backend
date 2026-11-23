import type { GameId } from '../../domain/game/game-id';
import {
  InvalidProgressError,
  PlayerProgress,
  type PlayerProgressProps,
} from '../../domain/progress/player-progress';
import { ApplicationError } from '../errors/application-error';
import {
  GAME_ID_MISMATCH_MESSAGE,
  UNKNOWN_LEVEL_MESSAGE,
} from '../errors/progress-messages';
import type { ILevelRepository } from '../ports/level-repository';
import type {
  IProgressRepository,
  StoredProgress,
} from '../ports/progress-repository';

export interface SyncProgressInput {
  /** Owner of the progress, already verified by the JWT guard. */
  readonly userId: string;
  /** The `gameId` of the path. */
  readonly gameId: GameId;
  /** The device's progress, as sent in the body. */
  readonly progress: PlayerProgressProps;
}

/**
 * CU-12: merges the device's progress with the stored one and returns the
 * result, which the client keeps. The merge itself is the entity's rule
 * (RN-36); this use case only checks the input and stores the outcome.
 */
export class SyncProgressUseCase {
  constructor(
    private readonly progress: IProgressRepository,
    private readonly levels: ILevelRepository,
  ) {}

  async execute(input: SyncProgressInput): Promise<StoredProgress> {
    if (input.progress.gameId !== input.gameId) {
      throw new ApplicationError('invalid', GAME_ID_MISMATCH_MESSAGE);
    }
    const incoming = toEntity(input.progress);
    await this.assertLevelsExist(incoming);
    return this.progress.save(input.userId, input.gameId, (current) =>
      current ? current.merge(incoming) : incoming,
    );
  }

  /** Every level must be a published level of this same game. */
  private async assertLevelsExist(progress: PlayerProgress): Promise<void> {
    if (progress.levels.length === 0) {
      return;
    }
    const ids = progress.levels.map((level) => level.levelId);
    const existing = await this.levels.existingIds(progress.gameId, ids);
    if (ids.some((id) => !existing.has(id))) {
      throw new ApplicationError('invalid', UNKNOWN_LEVEL_MESSAGE);
    }
  }
}

/** A broken rule of the entity becomes the contract's `400`. */
function toEntity(props: PlayerProgressProps): PlayerProgress {
  try {
    return PlayerProgress.create(props);
  } catch (error) {
    if (error instanceof InvalidProgressError) {
      throw new ApplicationError('invalid', error.message);
    }
    throw error;
  }
}
