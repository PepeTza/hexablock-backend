import type { GameId } from '../game/game-id';
import { DEFAULT_SEED_CONFIG, seedScopeOf } from './seed-scope';

describe('seedScopeOf', () => {
  it.each<GameId>(['hexa-lines', 'hexa-merge'])(
    'should_be_per_game_when_%s_is_endless',
    (gameId) => {
      // Act / Assert
      expect(seedScopeOf(gameId)).toBe('game');
    },
  );

  it('should_be_per_level_when_the_game_is_hexa_sort', () => {
    // Act / Assert
    expect(seedScopeOf('hexa-sort')).toBe('level');
  });

  it('should_be_none_when_the_game_is_hexa_fit', () => {
    // Act / Assert
    expect(seedScopeOf('hexa-fit')).toBeNull();
  });
});

describe('DEFAULT_SEED_CONFIG', () => {
  it('should_be_random_when_nobody_configured_the_seed', () => {
    // Act / Assert: RN-05.
    expect(DEFAULT_SEED_CONFIG).toEqual({ mode: 'random' });
  });
});
