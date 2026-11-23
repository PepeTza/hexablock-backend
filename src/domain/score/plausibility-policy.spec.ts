import type { GameId } from '../game/game-id';
import { plausibilityPolicyFor } from './plausibility-policy';
import { ScoreClaim } from './score-claim';

const LEVEL = '0a000000-0000-4000-8000-00000000000a';

/** A claim of 10 moves in one minute; only the score changes per test. */
function claim(
  gameId: GameId,
  score: number,
  moveCount = 10,
  durationMs = 60_000,
) {
  const isLevelGame = gameId === 'hexa-fit' || gameId === 'hexa-sort';
  return ScoreClaim.create({
    gameId,
    levelId: isLevelGame ? LEVEL : null,
    score,
    seed: gameId === 'hexa-fit' ? null : 7,
    moveCount,
    durationMs,
    finishedAt: new Date('2026-11-23T12:00:00Z'),
  });
}

function check(
  gameId: GameId,
  score: number,
  moveCount?: number,
  durationMs?: number,
) {
  return plausibilityPolicyFor(gameId).check(
    claim(gameId, score, moveCount, durationMs),
  );
}

describe('plausibilityPolicyFor', () => {
  it('should_accept_when_the_score_is_within_the_bound_of_each_game', () => {
    // Arrange: the exact maximum of each game for 10 moves.
    const maxima: [GameId, number][] = [
      ['hexa-lines', 73_175],
      ['hexa-merge', 980],
      ['hexa-sort', 4959],
      ['hexa-fit', 1000],
    ];

    // Act
    const results = maxima.map(([gameId, max]) => check(gameId, max));

    // Assert
    expect(results).toEqual([null, null, null, null]);
  });

  it('should_reject_when_the_score_exceeds_the_lines_bound', () => {
    // Act
    const reason = check('hexa-lines', 73_176);

    // Assert
    expect(reason).toBe('score above 73175 for 10 moves');
  });

  it('should_reject_when_the_score_exceeds_the_merge_bound', () => {
    // Act
    const reason = check('hexa-merge', 981);

    // Assert
    expect(reason).toBe('score above 980 for 10 moves');
  });

  it('should_reject_when_the_score_exceeds_the_sort_bound', () => {
    // Act
    const reason = check('hexa-sort', 4960);

    // Assert
    expect(reason).toBe('score above 4959 for 10 moves');
  });

  it('should_reject_when_a_fit_score_is_above_1000', () => {
    // Act
    const reason = check('hexa-fit', 1001);

    // Assert
    expect(reason).toBe('score above 1000 for 10 moves');
  });

  it('should_reject_when_moves_are_faster_than_the_minimum_time', () => {
    // Act: 10 moves in 999 ms, under 100 ms each.
    const tooFast = check('hexa-merge', 0, 10, 999);
    const justEnough = check('hexa-merge', 0, 10, 1000);

    // Assert
    expect(tooFast).toBe('under 100 ms per move');
    expect(justEnough).toBeNull();
  });

  it('should_reject_when_the_score_is_positive_with_zero_moves', () => {
    // Act
    const positive = check('hexa-fit', 100, 0, 0);
    const zero = check('hexa-lines', 0, 0, 0);

    // Assert
    expect(positive).toBe('score above 0 for 0 moves');
    expect(zero).toBeNull();
  });
});
