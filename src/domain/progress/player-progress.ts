import { type GameId, isLevelGame } from '../game/game-id';

/** The best result of one completed level. `stars` is `null` in Hexa Sort. */
export interface LevelResult {
  readonly levelId: string;
  readonly bestScore: number;
  readonly stars: number | null;
}

/** What a progress is made of, before its rules are checked. */
export interface PlayerProgressProps {
  readonly gameId: GameId;
  readonly bestScore: number;
  readonly levels: readonly LevelResult[];
}

/** A progress that breaks a rule of api-contracts §4. */
export class InvalidProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProgressError';
  }
}

const MIN_STARS = 1;
const MAX_STARS = 3;

/**
 * Entity: the progress of one player in one variant (domain-model
 * "PlayerProgress"; one per user and `gameId`, RN-33). It only improves:
 * `merge` keeps the best of two progresses (RN-36), so merging the same
 * progress again changes nothing and a retried sync is safe.
 */
export class PlayerProgress {
  readonly gameId: GameId;
  readonly bestScore: number;
  /** Sorted by `levelId`, so two equal progresses always look the same. */
  readonly levels: readonly LevelResult[];

  private constructor(props: PlayerProgressProps) {
    this.gameId = props.gameId;
    this.bestScore = props.bestScore;
    // Plain code-unit order, the same on every machine (no locale).
    this.levels = [...props.levels].sort((a, b) =>
      a.levelId < b.levelId ? -1 : a.levelId > b.levelId ? 1 : 0,
    );
  }

  /** Checks every rule; throws `InvalidProgressError` if one is broken. */
  static create(props: PlayerProgressProps): PlayerProgress {
    assertScore(props.bestScore, 'bestScore');
    if (isLevelGame(props.gameId)) {
      assertLevelGame(props);
    } else if (props.levels.length > 0) {
      throw new InvalidProgressError(`${props.gameId} has no levels`);
    }
    return new PlayerProgress(props);
  }

  /**
   * The best of both (RN-36): the higher `bestScore`, and per level the
   * higher score and the most stars, over the union of completed levels.
   */
  merge(other: PlayerProgress): PlayerProgress {
    if (other.gameId !== this.gameId) {
      throw new InvalidProgressError('Cannot merge progress of two games');
    }
    const levels = new Map(this.levels.map((level) => [level.levelId, level]));
    for (const level of other.levels) {
      const mine = levels.get(level.levelId);
      levels.set(level.levelId, mine ? bestOf(mine, level) : level);
    }
    return new PlayerProgress({
      gameId: this.gameId,
      bestScore: Math.max(this.bestScore, other.bestScore),
      levels: [...levels.values()],
    });
  }

  /** `true` when both hold exactly the same results. */
  equals(other: PlayerProgress): boolean {
    return (
      this.gameId === other.gameId &&
      this.bestScore === other.bestScore &&
      this.levels.length === other.levels.length &&
      this.levels.every((level, index) => {
        const theirs = other.levels[index];
        return (
          theirs !== undefined &&
          level.levelId === theirs.levelId &&
          level.bestScore === theirs.bestScore &&
          level.stars === theirs.stars
        );
      })
    );
  }
}

function bestOf(a: LevelResult, b: LevelResult): LevelResult {
  return {
    levelId: a.levelId,
    bestScore: Math.max(a.bestScore, b.bestScore),
    stars:
      a.stars === null || b.stars === null ? null : Math.max(a.stars, b.stars),
  };
}

/**
 * Level games keep their scores per level, so `bestScore` is 0. Hexa Fit
 * awards 1–3 stars and Hexa Sort none (RN-25). A level appears only once.
 */
function assertLevelGame(props: PlayerProgressProps): void {
  if (props.bestScore !== 0) {
    throw new InvalidProgressError(`bestScore must be 0 for ${props.gameId}`);
  }
  const seen = new Set<string>();
  for (const level of props.levels) {
    if (seen.has(level.levelId)) {
      throw new InvalidProgressError(`level ${level.levelId} appears twice`);
    }
    seen.add(level.levelId);
    assertScore(level.bestScore, 'level bestScore');
    assertStars(props.gameId, level.stars);
  }
}

function assertStars(gameId: GameId, stars: number | null): void {
  if (gameId === 'hexa-sort') {
    if (stars !== null) {
      throw new InvalidProgressError('hexa-sort levels have no stars');
    }
    return;
  }
  if (
    stars === null ||
    !Number.isInteger(stars) ||
    stars < MIN_STARS ||
    stars > MAX_STARS
  ) {
    throw new InvalidProgressError(
      `${gameId} levels need between ${MIN_STARS} and ${MAX_STARS} stars`,
    );
  }
}

function assertScore(score: number, name: string): void {
  if (!Number.isInteger(score) || score < 0) {
    throw new InvalidProgressError(
      `${name} must be a whole number of 0 or more`,
    );
  }
}
