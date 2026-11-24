import type { GameId } from '../../domain/game/game-id';
import type { ILevelCatalog, PublishedLevel } from '../ports/level-catalog';
import { ListLevelsUseCase } from './list-levels.use-case';

const NOW = new Date('2026-11-24T10:00:00Z');

function level(gameId: GameId, order: number): PublishedLevel {
  return {
    id: `${gameId}-${order}`,
    gameId,
    order,
    schemaVersion: 1,
    spec: {},
    publishedAt: NOW,
  };
}

/** Fake catalog holding fixed levels, filtered as the port promises. */
class FixedLevelCatalog implements ILevelCatalog {
  constructor(private readonly levels: readonly PublishedLevel[]) {}

  publish(): Promise<PublishedLevel> {
    return Promise.reject(new Error('not used by this use case'));
  }

  listAfter(gameId: GameId, after: number): Promise<PublishedLevel[]> {
    return Promise.resolve(
      this.levels
        .filter((stored) => stored.gameId === gameId && stored.order > after)
        .sort((a, b) => a.order - b.order),
    );
  }
}

describe('ListLevelsUseCase', () => {
  const useCase = new ListLevelsUseCase(
    new FixedLevelCatalog([
      level('hexa-sort', 3),
      level('hexa-sort', 1),
      level('hexa-fit', 1),
      level('hexa-sort', 2),
    ]),
  );

  it('should_return_the_levels_after_the_order_sorted_when_after_is_given', async () => {
    // Act
    const levels = await useCase.execute('hexa-sort', 1);

    // Assert
    expect(levels.map((found) => found.id)).toEqual([
      'hexa-sort-2',
      'hexa-sort-3',
    ]);
  });

  it('should_return_every_level_of_the_game_when_after_is_missing', async () => {
    // Act
    const levels = await useCase.execute('hexa-sort');

    // Assert
    expect(levels.map((found) => found.order)).toEqual([1, 2, 3]);
  });

  it.each<GameId>(['hexa-lines', 'hexa-merge'])(
    'should_reject_with_invalid_when_%s_has_no_levels',
    async (gameId) => {
      // Act
      const act = useCase.execute(gameId);

      // Assert
      await expect(act).rejects.toMatchObject({
        kind: 'invalid',
        message: 'this game has no levels',
      });
    },
  );
});
