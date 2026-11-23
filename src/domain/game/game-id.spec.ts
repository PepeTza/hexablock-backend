import { isGameId, isLevelGame } from './game-id';

describe('GameId', () => {
  it('should_tell_level_games_from_endless_games', () => {
    // Act
    const results = [
      isLevelGame('hexa-fit'),
      isLevelGame('hexa-sort'),
      isLevelGame('hexa-lines'),
      isLevelGame('hexa-merge'),
    ];

    // Assert
    expect(results).toEqual([true, true, false, false]);
  });

  it('should_accept_only_the_four_game_ids', () => {
    // Act
    const results = [
      isGameId('hexa-merge'),
      isGameId('hexa-2048'),
      isGameId(1),
    ];

    // Assert
    expect(results).toEqual([true, false, false]);
  });
});
