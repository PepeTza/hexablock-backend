import { type GameId, isLevelGame } from '../game/game-id';

/** What a finished game reports, before its rules are checked. */
export interface ScoreClaimProps {
  readonly gameId: GameId;
  /** Required in Hexa Fit and Hexa Sort; `null` in the endless games. */
  readonly levelId: string | null;
  readonly score: number;
  /** The seed of the game; `null` in Hexa Fit, which has no randomness. */
  readonly seed: number | null;
  readonly moveCount: number;
  readonly durationMs: number;
  readonly finishedAt: Date;
}

/** A claim that breaks a format rule of api-contracts §5. */
export class InvalidScoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidScoreError';
  }
}

/**
 * Entity: the score a player claims for one finished game (CU-13). It only
 * checks the rules that depend on the game; whether the score is plausible
 * is decided by an `IPlausibilityPolicy` (RN-39).
 */
export class ScoreClaim {
  readonly gameId: GameId;
  readonly levelId: string | null;
  readonly score: number;
  readonly seed: number | null;
  readonly moveCount: number;
  readonly durationMs: number;
  readonly finishedAt: Date;

  private constructor(props: ScoreClaimProps) {
    this.gameId = props.gameId;
    this.levelId = props.levelId;
    this.score = props.score;
    this.seed = props.seed;
    this.moveCount = props.moveCount;
    this.durationMs = props.durationMs;
    this.finishedAt = props.finishedAt;
  }

  /** Builds a claim, or throws `InvalidScoreError` naming the broken rule. */
  static create(props: ScoreClaimProps): ScoreClaim {
    for (const [field, value] of [
      ['score', props.score],
      ['moveCount', props.moveCount],
      ['durationMs', props.durationMs],
    ] as const) {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new InvalidScoreError(`${field} must be an integer of 0 or more`);
      }
    }
    if (isLevelGame(props.gameId) && props.levelId === null) {
      throw new InvalidScoreError(`levelId is required in ${props.gameId}`);
    }
    if (!isLevelGame(props.gameId) && props.levelId !== null) {
      throw new InvalidScoreError(`levelId must be null in ${props.gameId}`);
    }
    if (props.gameId === 'hexa-fit' && props.seed !== null) {
      throw new InvalidScoreError('seed must be null in hexa-fit');
    }
    if (props.gameId !== 'hexa-fit' && props.seed === null) {
      throw new InvalidScoreError(`seed is required in ${props.gameId}`);
    }
    return new ScoreClaim(props);
  }
}
