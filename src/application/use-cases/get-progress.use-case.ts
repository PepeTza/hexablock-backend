import type {
  IProgressRepository,
  StoredProgress,
} from '../ports/progress-repository';

/** CU-11 and CU-12: the progress of every game the player has synced. */
export class GetProgressUseCase {
  constructor(private readonly progress: IProgressRepository) {}

  execute(userId: string): Promise<StoredProgress[]> {
    return this.progress.findAll(userId);
  }
}
