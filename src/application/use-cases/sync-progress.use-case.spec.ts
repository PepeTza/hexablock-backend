import type { GameId } from '../../domain/game/game-id';
import { PlayerProgress } from '../../domain/progress/player-progress';
import { ApplicationError } from '../errors/application-error';
import {
  GAME_ID_MISMATCH_MESSAGE,
  UNKNOWN_LEVEL_MESSAGE,
} from '../errors/progress-messages';
import type { ILevelRepository } from '../ports/level-repository';
import type {
  IProgressRepository,
  StoredProgress,
} from '../ports/progress-repository';
import { SyncProgressUseCase } from './sync-progress.use-case';

const USER = 'user-1';
const LEVEL_A = '0a000000-0000-4000-8000-00000000000a';
const LEVEL_B = '0b000000-0000-4000-8000-00000000000b';
const NOW = new Date('2026-11-22T10:00:00Z');

/** Fake repository keeping one progress per user and game in memory. */
class InMemoryProgressRepository implements IProgressRepository {
  readonly stored = new Map<string, PlayerProgress>();

  findAll(): Promise<StoredProgress[]> {
    return Promise.reject(new Error('not used by this use case'));
  }

  save(
    userId: string,
    gameId: GameId,
    change: (current: PlayerProgress | null) => PlayerProgress,
  ): Promise<StoredProgress> {
    const key = `${userId}:${gameId}`;
    const progress = change(this.stored.get(key) ?? null);
    this.stored.set(key, progress);
    return Promise.resolve({ progress, updatedAt: NOW });
  }
}

/** Fake catalogue: LEVEL_A is a Hexa Fit level, LEVEL_B a Hexa Sort one. */
const levels: ILevelRepository = {
  existingIds: (gameId, ids) => {
    const published: Record<string, GameId> = {
      [LEVEL_A]: 'hexa-fit',
      [LEVEL_B]: 'hexa-sort',
    };
    return Promise.resolve(
      new Set(ids.filter((id) => published[id] === gameId)),
    );
  },
};

function setUp(): {
  useCase: SyncProgressUseCase;
  repository: InMemoryProgressRepository;
} {
  const repository = new InMemoryProgressRepository();
  return { useCase: new SyncProgressUseCase(repository, levels), repository };
}

describe('SyncProgressUseCase', () => {
  it('should_store_the_incoming_progress_when_the_game_was_never_synced', async () => {
    // Arrange
    const { useCase, repository } = setUp();

    // Act
    const result = await useCase.execute({
      userId: USER,
      gameId: 'hexa-lines',
      progress: { gameId: 'hexa-lines', bestScore: 300, levels: [] },
    });

    // Assert
    expect(result.progress.bestScore).toBe(300);
    expect(repository.stored.get(`${USER}:hexa-lines`)?.bestScore).toBe(300);
  });

  it('should_merge_with_the_stored_progress_when_it_exists', async () => {
    // Arrange
    const { useCase, repository } = setUp();
    repository.stored.set(
      `${USER}:hexa-fit`,
      PlayerProgress.create({
        gameId: 'hexa-fit',
        bestScore: 0,
        levels: [{ levelId: LEVEL_A, bestScore: 1800, stars: 1 }],
      }),
    );

    // Act
    const result = await useCase.execute({
      userId: USER,
      gameId: 'hexa-fit',
      progress: {
        gameId: 'hexa-fit',
        bestScore: 0,
        levels: [{ levelId: LEVEL_A, bestScore: 900, stars: 3 }],
      },
    });

    // Assert
    expect(result.progress.levels).toEqual([
      { levelId: LEVEL_A, bestScore: 1800, stars: 3 },
    ]);
  });

  it.each([
    ['does not exist', 'ffffffff-0000-4000-8000-00000000000f'],
    ['belongs to another game', LEVEL_B],
  ])('should_throw_invalid_when_a_level_%s', async (_case, levelId) => {
    // Arrange
    const { useCase, repository } = setUp();

    // Act
    const act = useCase.execute({
      userId: USER,
      gameId: 'hexa-fit',
      progress: {
        gameId: 'hexa-fit',
        bestScore: 0,
        levels: [{ levelId, bestScore: 100, stars: 2 }],
      },
    });

    // Assert
    await expect(act).rejects.toEqual(
      new ApplicationError('invalid', UNKNOWN_LEVEL_MESSAGE),
    );
    expect(repository.stored.size).toBe(0);
  });

  it('should_throw_invalid_when_the_body_game_id_does_not_match_the_path', async () => {
    // Arrange
    const { useCase } = setUp();

    // Act
    const act = useCase.execute({
      userId: USER,
      gameId: 'hexa-merge',
      progress: { gameId: 'hexa-lines', bestScore: 1, levels: [] },
    });

    // Assert
    await expect(act).rejects.toEqual(
      new ApplicationError('invalid', GAME_ID_MISMATCH_MESSAGE),
    );
  });

  it('should_throw_invalid_with_the_entity_message_when_a_rule_is_broken', async () => {
    // Arrange
    const { useCase } = setUp();

    // Act
    const act = useCase.execute({
      userId: USER,
      gameId: 'hexa-sort',
      progress: {
        gameId: 'hexa-sort',
        bestScore: 0,
        levels: [{ levelId: LEVEL_B, bestScore: 100, stars: 2 }],
      },
    });

    // Assert
    await expect(act).rejects.toEqual(
      new ApplicationError('invalid', 'hexa-sort levels have no stars'),
    );
  });
});
