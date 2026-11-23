import {
  InvalidProgressError,
  PlayerProgress,
  type LevelResult,
} from './player-progress';

const LEVEL_A = '0a000000-0000-4000-8000-00000000000a';
const LEVEL_B = '0b000000-0000-4000-8000-00000000000b';

function fit(...levels: LevelResult[]): PlayerProgress {
  return PlayerProgress.create({ gameId: 'hexa-fit', bestScore: 0, levels });
}

describe('PlayerProgress', () => {
  it('should_keep_the_higher_best_score_when_merging_an_endless_game', () => {
    // Arrange
    const server = PlayerProgress.create({
      gameId: 'hexa-lines',
      bestScore: 500,
      levels: [],
    });
    const device = PlayerProgress.create({
      gameId: 'hexa-lines',
      bestScore: 300,
      levels: [],
    });

    // Act
    const merged = server.merge(device);

    // Assert
    expect(merged.bestScore).toBe(500);
    expect(device.merge(server).bestScore).toBe(500);
  });

  it('should_keep_the_best_score_and_max_stars_per_level_when_merging', () => {
    // Arrange: each side is better in one value.
    const server = fit({ levelId: LEVEL_A, bestScore: 1800, stars: 1 });
    const device = fit({ levelId: LEVEL_A, bestScore: 900, stars: 3 });

    // Act
    const merged = server.merge(device);

    // Assert
    expect(merged.levels).toEqual([
      { levelId: LEVEL_A, bestScore: 1800, stars: 3 },
    ]);
  });

  it('should_contain_the_union_of_levels_when_merging', () => {
    // Arrange
    const server = fit({ levelId: LEVEL_B, bestScore: 700, stars: 2 });
    const device = fit({ levelId: LEVEL_A, bestScore: 400, stars: 1 });

    // Act
    const merged = server.merge(device);

    // Assert: sorted by levelId, whatever the input order.
    expect(merged.levels.map((level) => level.levelId)).toEqual([
      LEVEL_A,
      LEVEL_B,
    ]);
  });

  it('should_give_the_same_result_when_merging_the_same_progress_twice', () => {
    // Arrange
    const server = fit({ levelId: LEVEL_A, bestScore: 1800, stars: 1 });
    const device = fit(
      { levelId: LEVEL_A, bestScore: 900, stars: 3 },
      { levelId: LEVEL_B, bestScore: 400, stars: 2 },
    );

    // Act
    const once = server.merge(device);
    const twice = once.merge(device);

    // Assert
    expect(twice.equals(once)).toBe(true);
    expect(once.merge(once).equals(once)).toBe(true);
  });

  it('should_tell_when_two_progresses_hold_different_results', () => {
    // Arrange
    const a = fit({ levelId: LEVEL_A, bestScore: 900, stars: 2 });
    const b = fit({ levelId: LEVEL_A, bestScore: 900, stars: 3 });

    // Act
    const equal = a.equals(b);

    // Assert
    expect(equal).toBe(false);
  });

  it('should_reject_levels_when_the_game_is_endless', () => {
    // Act
    const create = () =>
      PlayerProgress.create({
        gameId: 'hexa-merge',
        bestScore: 10,
        levels: [{ levelId: LEVEL_A, bestScore: 1, stars: null }],
      });

    // Assert
    expect(create).toThrow(
      new InvalidProgressError('hexa-merge has no levels'),
    );
  });

  it('should_reject_a_best_score_when_the_game_has_levels', () => {
    // Act
    const create = () =>
      PlayerProgress.create({ gameId: 'hexa-fit', bestScore: 5, levels: [] });

    // Assert
    expect(create).toThrow(InvalidProgressError);
  });

  it('should_reject_stars_when_the_game_is_hexa_sort', () => {
    // Act
    const create = () =>
      PlayerProgress.create({
        gameId: 'hexa-sort',
        bestScore: 0,
        levels: [{ levelId: LEVEL_A, bestScore: 100, stars: 2 }],
      });

    // Assert
    expect(create).toThrow(
      new InvalidProgressError('hexa-sort levels have no stars'),
    );
  });

  it.each([null, 0, 4, 1.5])(
    'should_reject_a_hexa_fit_level_without_stars_between_1_and_3 (%p)',
    (stars) => {
      // Act
      const create = () => fit({ levelId: LEVEL_A, bestScore: 100, stars });

      // Assert
      expect(create).toThrow(InvalidProgressError);
    },
  );

  it('should_reject_the_progress_when_a_level_appears_twice', () => {
    // Act
    const create = () =>
      fit(
        { levelId: LEVEL_A, bestScore: 100, stars: 1 },
        { levelId: LEVEL_A, bestScore: 200, stars: 2 },
      );

    // Assert
    expect(create).toThrow(InvalidProgressError);
  });

  it.each([-1, 2.5])(
    'should_reject_the_progress_when_a_score_is_not_a_whole_number_of_0_or_more (%p)',
    (bestScore) => {
      // Act
      const create = () =>
        PlayerProgress.create({ gameId: 'hexa-lines', bestScore, levels: [] });

      // Assert
      expect(create).toThrow(InvalidProgressError);
    },
  );

  it('should_refuse_to_merge_the_progress_of_two_games', () => {
    // Arrange
    const lines = PlayerProgress.create({
      gameId: 'hexa-lines',
      bestScore: 1,
      levels: [],
    });
    const merge = PlayerProgress.create({
      gameId: 'hexa-merge',
      bestScore: 1,
      levels: [],
    });

    // Act
    const act = () => lines.merge(merge);

    // Assert
    expect(act).toThrow(InvalidProgressError);
  });
});
