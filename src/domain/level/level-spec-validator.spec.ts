import type { GameId } from '../game/game-id';
import {
  type ILevelSpecValidator,
  LevelSpecValidators,
} from './level-spec-validator';

function fakeValidator(
  gameId: GameId,
  schemaVersion: number,
): ILevelSpecValidator {
  return { gameId, schemaVersion, validate: () => [] };
}

describe('LevelSpecValidators', () => {
  it('should_find_the_validator_when_game_and_version_match', () => {
    // Arrange
    const sort = fakeValidator('hexa-sort', 1);
    const validators = new LevelSpecValidators([sort]);

    // Act / Assert
    expect(validators.find('hexa-sort', 1)).toBe(sort);
  });

  it('should_return_undefined_when_the_version_is_unknown', () => {
    // Arrange
    const validators = new LevelSpecValidators([fakeValidator('hexa-sort', 1)]);

    // Act / Assert
    expect(validators.find('hexa-sort', 2)).toBeUndefined();
    expect(validators.find('hexa-fit', 1)).toBeUndefined();
  });

  it('should_reject_two_validators_when_they_share_game_and_version', () => {
    // Act / Assert
    expect(
      () =>
        new LevelSpecValidators([
          fakeValidator('hexa-sort', 1),
          fakeValidator('hexa-sort', 1),
        ]),
    ).toThrow('Two level spec validators for hexa-sort@1');
  });
});
