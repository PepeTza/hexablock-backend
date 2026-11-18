import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';

import { testDatabaseUrl } from './test-database-url';

type Transaction = Prisma.TransactionClient;

const ROLLBACK = new Error('rollback test data');
const UNIQUE_VIOLATION = { code: 'P2002' };

const TABLES = [
  'leaderboard_entries',
  'level_progress',
  'levels',
  'player_progress',
  'score_submissions',
  'seed_configs',
  'users',
];

const PARTIAL_UNIQUE_INDEXES = [
  'leaderboard_per_game',
  'leaderboard_per_level',
  'seed_config_per_game',
  'seed_config_per_level',
];

/**
 * Runs `work` inside a transaction that is always rolled back, so the tests
 * leave no rows behind in the development database.
 */
async function withRollback(
  prisma: PrismaClient,
  work: (tx: Transaction) => Promise<void>,
): Promise<void> {
  await expect(
    prisma.$transaction(async (tx) => {
      await work(tx);
      throw ROLLBACK;
    }),
  ).rejects.toBe(ROLLBACK);
}

function createUser(tx: Transaction) {
  return tx.user.create({
    data: { username: `test-${randomUUID()}`, passwordHash: 'not-a-hash' },
  });
}

function createLevel(tx: Transaction, publishedBy: string) {
  return tx.level.create({
    data: {
      gameId: 'hexa_fit',
      // Random order, so it never clashes with a real level of the same game.
      order: 1_000_000 + Math.floor(Math.random() * 1_000_000_000),
      schemaVersion: 1,
      spec: {},
      publishedBy,
    },
  });
}

describe('Database schema (e2e)', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should_create_every_table_of_the_data_model_when_migrations_are_applied', async () => {
    // Act
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;

    // Assert
    expect(rows.map((row) => row.tablename)).toEqual(
      expect.arrayContaining(TABLES),
    );
  });

  it('should_create_the_four_partial_unique_indexes_when_migrations_are_applied', async () => {
    // Act
    const rows = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexdef LIKE '%WHERE%'`;

    // Assert
    expect(rows.map((row) => row.indexname).sort()).toEqual(
      PARTIAL_UNIQUE_INDEXES,
    );
  });

  it('should_reject_a_second_endless_leaderboard_entry_for_the_same_player', async () => {
    await withRollback(prisma, async (tx) => {
      // Arrange
      const user = await createUser(tx);
      const entry = {
        userId: user.id,
        gameId: 'hexa_lines' as const,
        bestScore: 100,
        achievedAt: new Date(),
      };
      await tx.leaderboardEntry.create({ data: entry });

      // Act
      const second = tx.leaderboardEntry.create({ data: entry });

      // Assert
      await expect(second).rejects.toMatchObject(UNIQUE_VIOLATION);
    });
  });

  it('should_accept_entries_of_the_same_player_on_different_levels', async () => {
    await withRollback(prisma, async (tx) => {
      // Arrange
      const user = await createUser(tx);
      const firstLevel = await createLevel(tx, user.id);
      const secondLevel = await createLevel(tx, user.id);
      const entry = {
        userId: user.id,
        gameId: 'hexa_fit' as const,
        bestScore: 500,
        achievedAt: new Date(),
      };

      // Act
      await tx.leaderboardEntry.create({
        data: { ...entry, levelId: firstLevel.id },
      });
      await tx.leaderboardEntry.create({
        data: { ...entry, levelId: secondLevel.id },
      });

      // Assert
      const count = await tx.leaderboardEntry.count({
        where: { userId: user.id },
      });
      expect(count).toBe(2);
    });
  });

  it('should_reject_a_second_seed_config_for_the_same_endless_game', async () => {
    await withRollback(prisma, async (tx) => {
      // Arrange: make sure Hexa Merge already has its one game-level config.
      const user = await createUser(tx);
      const config = {
        gameId: 'hexa_merge' as const,
        mode: 'random' as const,
        updatedBy: user.id,
      };
      const existing = await tx.seedConfig.findFirst({
        where: { gameId: 'hexa_merge', levelId: null },
      });
      if (!existing) {
        await tx.seedConfig.create({ data: config });
      }

      // Act
      const second = tx.seedConfig.create({ data: config });

      // Assert
      await expect(second).rejects.toMatchObject(UNIQUE_VIOLATION);
    });
  });

  it('should_store_the_game_id_with_hyphens_when_saving_hexa_lines', async () => {
    await withRollback(prisma, async (tx) => {
      // Arrange
      const user = await createUser(tx);

      // Act
      await tx.playerProgress.create({
        data: { userId: user.id, gameId: 'hexa_lines', bestScore: 0 },
      });

      // Assert
      const rows = await tx.$queryRaw<{ game_id: string }[]>`
        SELECT game_id::text FROM player_progress WHERE user_id = ${user.id}::uuid`;
      expect(rows).toEqual([{ game_id: 'hexa-lines' }]);
    });
  });
});
