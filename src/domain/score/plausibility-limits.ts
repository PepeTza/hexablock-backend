/**
 * Limits of the plausibility check (RN-39, api-contracts §5). They are
 * theoretical maxima derived from the scoring rules, deliberately loose: an
 * honest score must never be rejected, because the player is not told
 * (RN-43). When decision 8 changes a formula, only these numbers change.
 */

/** No human places or slides faster than one move every 100 ms. */
export const MIN_MS_PER_MOVE = 100;

/**
 * Hexa Lines (client `architecture.md` D-08): a move earns
 * `cells + 10·L²·(1 + 0.5·(S − 1))`. A piece has at most 5 cells and can
 * complete at most 15 lines, and the streak on move `m` is at most `m`, so
 * move `m` earns at most `5 + 1125·(m + 1)`.
 */
export const LINES_MAX_CELLS = 5;
export const LINES_STREAK_FACTOR = 1125;

/**
 * Hexa Merge (RN-28, RN-29): merging keeps the total value of the board and
 * every move adds a tile of at most 4, on a board of 19 cells (radius 2). On
 * move `m` the board holds at most `4·(19 + m)`, and the merges of one move
 * cannot produce more than that.
 */
export const MERGE_MAX_TILE = 4;
export const MERGE_BOARD_CELLS = 19;

/**
 * Hexa Sort (RN-40, api-contracts §6): a cleared chip is worth 1 point,
 * times the goals of its cascade. At most 19 initial stacks of 9 chips plus
 * one stack of 9 chips per move ever reach the board, and one cascade
 * cannot complete more goals than there are cells.
 */
export const SORT_BOARD_CELLS = 19;
export const SORT_MAX_CHIPS_PER_STACK = 9;

/**
 * Hexa Fit (decision 8 proposal): `max(100, 1000 − 20·extraMoves −
 * 2·seconds)`, so a level is worth at most 1000.
 */
export const FIT_MAX_SCORE = 1000;
