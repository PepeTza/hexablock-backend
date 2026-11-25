import type { GameId } from '../../domain/game/game-id';
import type {
  ISeedConfigStore,
  LevelSeedConfig,
  StoredSeedConfig,
} from '../ports/seed-config-store';
import { GetSeedConfigUseCase } from './get-seed-config.use-case';

const SAVED_AT = new Date('2026-11-24T10:00:00Z');

/** Fake store holding one config per game and fixed Sort levels. */
class FakeSeedConfigStore implements ISeedConfigStore {
  constructor(
    private readonly games: Partial<Record<GameId, StoredSeedConfig>> = {},
    private readonly levels: LevelSeedConfig[] = [],
  ) {}

  findForGame(gameId: GameId): Promise<StoredSeedConfig | null> {
    return Promise.resolve(this.games[gameId] ?? null);
  }

  listForLevels(): Promise<LevelSeedConfig[]> {
    return Promise.resolve(this.levels);
  }
}

describe('GetSeedConfigUseCase', () => {
  it('should_return_the_default_random_with_null_updated_at_when_never_configured', async () => {
    // Arrange
    const useCase = new GetSeedConfigUseCase(new FakeSeedConfigStore());

    // Act
    const view = await useCase.execute('hexa-merge');

    // Assert
    expect(view).toEqual({
      scope: 'game',
      gameId: 'hexa-merge',
      entry: { config: { mode: 'random' }, updatedAt: null },
    });
  });

  it('should_return_the_stored_config_when_the_game_was_configured', async () => {
    // Arrange
    const stored = {
      config: { mode: 'fixed', value: 42 },
      updatedAt: SAVED_AT,
    } as const;
    const useCase = new GetSeedConfigUseCase(
      new FakeSeedConfigStore({ 'hexa-lines': stored }),
    );

    // Act
    const view = await useCase.execute('hexa-lines');

    // Assert
    expect(view).toEqual({
      scope: 'game',
      gameId: 'hexa-lines',
      entry: stored,
    });
  });

  it('should_list_every_sort_level_with_its_config_or_the_default', async () => {
    // Arrange
    const useCase = new GetSeedConfigUseCase(
      new FakeSeedConfigStore({}, [
        {
          levelId: 'level-1',
          stored: { config: { mode: 'fixed', value: 7 }, updatedAt: SAVED_AT },
        },
        { levelId: 'level-2', stored: null },
      ]),
    );

    // Act
    const view = await useCase.execute('hexa-sort');

    // Assert
    expect(view).toEqual({
      scope: 'level',
      gameId: 'hexa-sort',
      levels: [
        {
          levelId: 'level-1',
          config: { mode: 'fixed', value: 7 },
          updatedAt: SAVED_AT,
        },
        { levelId: 'level-2', config: { mode: 'random' }, updatedAt: null },
      ],
    });
  });

  it('should_reject_with_invalid_when_the_game_is_hexa_fit', async () => {
    // Arrange
    const useCase = new GetSeedConfigUseCase(new FakeSeedConfigStore());

    // Act
    const act = useCase.execute('hexa-fit');

    // Assert
    await expect(act).rejects.toMatchObject({
      kind: 'invalid',
      message: 'this game has no seed',
    });
  });
});
