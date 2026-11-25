import type { GameId } from '../../domain/game/game-id';
import type { SeedConfig } from '../../domain/seed/seed-config';
import type { ILevelRepository } from '../ports/level-repository';
import type {
  ISeedConfigStore,
  LevelSeedConfig,
  SeedTarget,
  StoredSeedConfig,
} from '../ports/seed-config-store';
import { ConfigureSeedUseCase } from './configure-seed.use-case';

const ADMIN = 'admin-1';
const LEVEL = 'level-1';
const SAVED_AT = new Date('2026-11-24T10:00:00Z');
const FIXED: SeedConfig = { mode: 'fixed', value: 42 };

interface SavedCall {
  readonly target: SeedTarget;
  readonly config: SeedConfig;
  readonly updatedBy: string;
}

/** Fake store recording every save. */
class RecordingSeedConfigStore implements ISeedConfigStore {
  readonly saved: SavedCall[] = [];

  findForGame(): Promise<StoredSeedConfig | null> {
    return Promise.reject(new Error('not used by this use case'));
  }

  listForLevels(): Promise<LevelSeedConfig[]> {
    return Promise.reject(new Error('not used by this use case'));
  }

  save(
    target: SeedTarget,
    config: SeedConfig,
    updatedBy: string,
  ): Promise<StoredSeedConfig> {
    this.saved.push({ target, config, updatedBy });
    return Promise.resolve({ config, updatedAt: SAVED_AT });
  }
}

/** Fake levels: only `LEVEL` is published. */
class FakeLevelRepository implements ILevelRepository {
  existingIds(
    _gameId: GameId,
    levelIds: readonly string[],
  ): Promise<Set<string>> {
    return Promise.resolve(new Set(levelIds.filter((id) => id === LEVEL)));
  }
}

function setUp() {
  const store = new RecordingSeedConfigStore();
  const useCase = new ConfigureSeedUseCase(store, new FakeLevelRepository());
  return { store, useCase };
}

describe('ConfigureSeedUseCase', () => {
  it('should_save_the_game_config_and_record_the_admin_when_the_game_is_per_game', async () => {
    // Arrange
    const { store, useCase } = setUp();

    // Act
    const view = await useCase.execute({
      updatedBy: ADMIN,
      gameId: 'hexa-lines',
      levelId: null,
      config: FIXED,
    });

    // Assert
    expect(store.saved).toEqual([
      {
        target: { gameId: 'hexa-lines', levelId: null },
        config: FIXED,
        updatedBy: ADMIN,
      },
    ]);
    expect(view).toEqual({
      scope: 'game',
      gameId: 'hexa-lines',
      entry: { config: FIXED, updatedAt: SAVED_AT },
    });
  });

  it('should_save_and_return_only_that_level_when_the_game_is_hexa_sort', async () => {
    // Arrange
    const { store, useCase } = setUp();

    // Act
    const view = await useCase.execute({
      updatedBy: ADMIN,
      gameId: 'hexa-sort',
      levelId: LEVEL,
      config: { mode: 'random' },
    });

    // Assert
    expect(store.saved).toEqual([
      {
        target: { gameId: 'hexa-sort', levelId: LEVEL },
        config: { mode: 'random' },
        updatedBy: ADMIN,
      },
    ]);
    expect(view).toEqual({
      scope: 'level',
      gameId: 'hexa-sort',
      levels: [
        { levelId: LEVEL, config: { mode: 'random' }, updatedAt: SAVED_AT },
      ],
    });
  });

  it.each<[string, GameId, string | null, string, string]>([
    [
      'hexa_sort_has_no_level_id',
      'hexa-sort',
      null,
      'invalid',
      'levelId is required for this game',
    ],
    [
      'hexa_merge_has_a_level_id',
      'hexa-merge',
      LEVEL,
      'invalid',
      'levelId is not allowed for this game',
    ],
    [
      'the_game_is_hexa_fit',
      'hexa-fit',
      null,
      'invalid',
      'this game has no seed',
    ],
    [
      'the_level_is_unknown',
      'hexa-sort',
      'level-404',
      'not_found',
      'unknown levelId for this game',
    ],
  ])(
    'should_reject_without_saving_when_%s',
    async (_case, gameId, levelId, kind, message) => {
      // Arrange
      const { store, useCase } = setUp();

      // Act
      const act = useCase.execute({
        updatedBy: ADMIN,
        gameId,
        levelId,
        config: FIXED,
      });

      // Assert
      await expect(act).rejects.toMatchObject({ kind, message });
      expect(store.saved).toEqual([]);
    },
  );
});
