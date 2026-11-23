import type { GameId } from '../game/game-id';
import {
  InvalidScoreError,
  ScoreClaim,
  type ScoreClaimProps,
} from './score-claim';

const LEVEL = '0a000000-0000-4000-8000-00000000000a';

function props(gameId: GameId, overrides: Partial<ScoreClaimProps> = {}) {
  const isLevelGame = gameId === 'hexa-fit' || gameId === 'hexa-sort';
  return {
    gameId,
    levelId: isLevelGame ? LEVEL : null,
    score: 100,
    seed: gameId === 'hexa-fit' ? null : 1739201,
    moveCount: 10,
    durationMs: 60_000,
    finishedAt: new Date('2026-11-23T12:00:00Z'),
    ...overrides,
  };
}

describe('ScoreClaim', () => {
  it('should_create_a_claim_when_every_game_follows_its_format', () => {
    // Arrange
    const games: GameId[] = [
      'hexa-lines',
      'hexa-fit',
      'hexa-sort',
      'hexa-merge',
    ];

    // Act
    const claims = games.map((gameId) => ScoreClaim.create(props(gameId)));

    // Assert
    expect(claims.map((claim) => claim.gameId)).toEqual(games);
  });

  it('should_throw_when_a_level_game_has_no_level_id', () => {
    // Act
    const act = () => ScoreClaim.create(props('hexa-sort', { levelId: null }));

    // Assert
    expect(act).toThrow(
      new InvalidScoreError('levelId is required in hexa-sort'),
    );
  });

  it('should_throw_when_an_endless_game_has_a_level_id', () => {
    // Act
    const act = () =>
      ScoreClaim.create(props('hexa-lines', { levelId: LEVEL }));

    // Assert
    expect(act).toThrow(
      new InvalidScoreError('levelId must be null in hexa-lines'),
    );
  });

  it('should_throw_when_fit_has_a_seed', () => {
    // Act
    const act = () => ScoreClaim.create(props('hexa-fit', { seed: 42 }));

    // Assert
    expect(act).toThrow(new InvalidScoreError('seed must be null in hexa-fit'));
  });

  it('should_throw_when_lines_has_no_seed', () => {
    // Act
    const act = () => ScoreClaim.create(props('hexa-lines', { seed: null }));

    // Assert
    expect(act).toThrow(
      new InvalidScoreError('seed is required in hexa-lines'),
    );
  });

  it('should_throw_when_a_count_is_negative', () => {
    // Act
    const act = () => ScoreClaim.create(props('hexa-merge', { moveCount: -1 }));

    // Assert
    expect(act).toThrow(
      new InvalidScoreError('moveCount must be an integer of 0 or more'),
    );
  });
});
