import type { GameId } from '../game/game-id';
import {
  FIT_MAX_SCORE,
  LINES_MAX_CELLS,
  LINES_STREAK_FACTOR,
  MERGE_BOARD_CELLS,
  MERGE_MAX_TILE,
  MIN_MS_PER_MOVE,
  SORT_BOARD_CELLS,
  SORT_MAX_CHIPS_PER_STACK,
} from './plausibility-limits';
import type { ScoreClaim } from './score-claim';

/**
 * Strategy: decides whether a claimed score could be reached in its game
 * (RN-39). Returns why it could not, or `null` when it is plausible.
 */
export interface IPlausibilityPolicy {
  check(claim: ScoreClaim): string | null;
}

/**
 * Template Method: every game shares the time and zero-move checks; each
 * subclass only says the highest score reachable in `moves` moves.
 */
abstract class BoundedScorePolicy implements IPlausibilityPolicy {
  check(claim: ScoreClaim): string | null {
    if (claim.durationMs < claim.moveCount * MIN_MS_PER_MOVE) {
      return `under ${MIN_MS_PER_MOVE} ms per move`;
    }
    const max = claim.moveCount === 0 ? 0 : this.maxScore(claim.moveCount);
    if (claim.score > max) {
      return `score above ${max} for ${claim.moveCount} moves`;
    }
    return null;
  }

  protected abstract maxScore(moves: number): number;
}

/** Sum of the integers from 1 to `n`. */
function triangle(n: number): number {
  return (n * (n + 1)) / 2;
}

/** Hexa Lines: the D-08 bound per move, added up over every move. */
export class LinesPlausibility extends BoundedScorePolicy {
  protected maxScore(moves: number): number {
    return (
      LINES_MAX_CELLS * moves + LINES_STREAK_FACTOR * (triangle(moves) + moves)
    );
  }
}

/** Hexa Merge: on move `m` merges produce at most the board's total value. */
export class MergePlausibility extends BoundedScorePolicy {
  protected maxScore(moves: number): number {
    return MERGE_MAX_TILE * (MERGE_BOARD_CELLS * moves + triangle(moves));
  }
}

/** Hexa Sort: every chip that reaches the board, times the most goals. */
export class SortPlausibility extends BoundedScorePolicy {
  protected maxScore(moves: number): number {
    return (
      SORT_BOARD_CELLS * SORT_MAX_CHIPS_PER_STACK * (SORT_BOARD_CELLS + moves)
    );
  }
}

/** Hexa Fit: a level is worth at most the top of its formula. */
export class FitPlausibility extends BoundedScorePolicy {
  protected maxScore(): number {
    return FIT_MAX_SCORE;
  }
}

const POLICIES: Readonly<Record<GameId, IPlausibilityPolicy>> = {
  'hexa-lines': new LinesPlausibility(),
  'hexa-fit': new FitPlausibility(),
  'hexa-sort': new SortPlausibility(),
  'hexa-merge': new MergePlausibility(),
};

/** The plausibility strategy of a game. */
export function plausibilityPolicyFor(gameId: GameId): IPlausibilityPolicy {
  return POLICIES[gameId];
}
