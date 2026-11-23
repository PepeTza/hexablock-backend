import { PlayerProgress } from '../../domain/progress/player-progress';
import {
  PrismaProgressRepository,
  type ProgressClient,
} from './prisma-progress-repository';

const USER = '7f1c0000-0000-4000-8000-000000000001';
const LEVEL_A = '0a000000-0000-4000-8000-00000000000a';
const STORED_AT = new Date('2026-11-20T10:00:00Z');
const SAVED_AT = new Date('2026-11-22T10:00:00Z');

/** Fake transaction: Hexa Fit progress with one level is stored. */
function fakeTransaction() {
  return {
    $executeRaw: jest.fn(() => Promise.resolve(1)),
    playerProgress: {
      findUnique: jest.fn(() =>
        Promise.resolve({
          userId: USER,
          gameId: 'hexa_fit',
          bestScore: 0,
          updatedAt: STORED_AT,
        }),
      ),
      upsert: jest.fn(() => Promise.resolve({ updatedAt: SAVED_AT })),
    },
    levelProgress: {
      findMany: jest.fn(() =>
        Promise.resolve([{ levelId: LEVEL_A, bestScore: 1800, stars: 2 }]),
      ),
      upsert: jest.fn(() => Promise.resolve({})),
    },
  };
}

function repositoryWith(tx: ReturnType<typeof fakeTransaction>) {
  const client = {
    $transaction: (work: (t: typeof tx) => Promise<unknown>) => work(tx),
  } as unknown as ProgressClient;
  return new PrismaProgressRepository(client);
}

function fitWith(bestScore: number, stars: number): PlayerProgress {
  return PlayerProgress.create({
    gameId: 'hexa-fit',
    bestScore: 0,
    levels: [{ levelId: LEVEL_A, bestScore, stars }],
  });
}

describe('PrismaProgressRepository', () => {
  it('should_not_write_when_the_merged_progress_did_not_change', async () => {
    // Arrange: the device sends a worse result than the stored one.
    const tx = fakeTransaction();
    const repository = repositoryWith(tx);

    // Act
    const saved = await repository.save(USER, 'hexa-fit', (current) =>
      current ? current.merge(fitWith(900, 1)) : fitWith(900, 1),
    );

    // Assert: same result, same date, nothing written.
    expect(saved.updatedAt).toBe(STORED_AT);
    expect(saved.progress.levels).toEqual([
      { levelId: LEVEL_A, bestScore: 1800, stars: 2 },
    ]);
    expect(tx.playerProgress.upsert).not.toHaveBeenCalled();
    expect(tx.levelProgress.upsert).not.toHaveBeenCalled();
  });

  it('should_take_the_lock_before_reading_the_stored_progress', async () => {
    // Arrange
    const tx = fakeTransaction();
    const repository = repositoryWith(tx);

    // Act
    await repository.save(USER, 'hexa-fit', (current) => current!);

    // Assert
    const lockedAt = tx.$executeRaw.mock.invocationCallOrder[0] ?? Infinity;
    const readAt =
      tx.playerProgress.findUnique.mock.invocationCallOrder[0] ?? -Infinity;
    expect(lockedAt).toBeLessThan(readAt);
  });

  it('should_write_the_game_row_and_only_the_improved_levels_when_the_progress_changed', async () => {
    // Arrange
    const tx = fakeTransaction();
    const repository = repositoryWith(tx);

    // Act
    const saved = await repository.save(USER, 'hexa-fit', (current) =>
      current!.merge(fitWith(900, 3)),
    );

    // Assert
    expect(saved.updatedAt).toBe(SAVED_AT);
    expect(tx.playerProgress.upsert).toHaveBeenCalledTimes(1);
    expect(tx.levelProgress.upsert).toHaveBeenCalledWith({
      where: { userId_levelId: { userId: USER, levelId: LEVEL_A } },
      create: { userId: USER, levelId: LEVEL_A, bestScore: 1800, stars: 3 },
      update: { bestScore: 1800, stars: 3 },
    });
  });

  it('should_group_levels_by_their_game_when_reading_all_progress', async () => {
    // Arrange: Lines and Fit synced; the level belongs to Fit.
    const client = {
      playerProgress: {
        findMany: () =>
          Promise.resolve([
            { gameId: 'hexa_lines', bestScore: 700, updatedAt: STORED_AT },
            { gameId: 'hexa_fit', bestScore: 0, updatedAt: SAVED_AT },
          ]),
      },
      levelProgress: {
        findMany: () =>
          Promise.resolve([
            {
              levelId: LEVEL_A,
              bestScore: 1800,
              stars: 2,
              level: { gameId: 'hexa_fit' },
            },
          ]),
      },
    } as unknown as ProgressClient;

    // Act
    const all = await new PrismaProgressRepository(client).findAll(USER);

    // Assert
    expect(
      all.map(({ progress }) => [progress.gameId, progress.levels.length]),
    ).toEqual([
      ['hexa-lines', 0],
      ['hexa-fit', 1],
    ]);
  });
});
