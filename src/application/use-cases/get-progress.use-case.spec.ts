import { PlayerProgress } from '../../domain/progress/player-progress';
import type {
  IProgressRepository,
  StoredProgress,
} from '../ports/progress-repository';
import { GetProgressUseCase } from './get-progress.use-case';

const UPDATED_AT = new Date('2026-11-22T10:00:00Z');

/** Fake repository where only `user-1` has synced, and only Hexa Lines. */
class InMemoryProgressRepository implements IProgressRepository {
  findAll(userId: string): Promise<StoredProgress[]> {
    if (userId !== 'user-1') {
      return Promise.resolve([]);
    }
    const progress = PlayerProgress.create({
      gameId: 'hexa-lines',
      bestScore: 700,
      levels: [],
    });
    return Promise.resolve([{ progress, updatedAt: UPDATED_AT }]);
  }

  save(): Promise<StoredProgress> {
    return Promise.reject(new Error('not used by this use case'));
  }
}

describe('GetProgressUseCase', () => {
  it('should_return_only_the_games_the_player_has_played', async () => {
    // Arrange
    const useCase = new GetProgressUseCase(new InMemoryProgressRepository());

    // Act
    const mine = await useCase.execute('user-1');
    const someoneElse = await useCase.execute('user-2');

    // Assert
    expect(mine.map((entry) => entry.progress.gameId)).toEqual(['hexa-lines']);
    expect(someoneElse).toEqual([]);
  });
});
