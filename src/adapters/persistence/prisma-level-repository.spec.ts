import {
  type LevelClient,
  PrismaLevelRepository,
} from './prisma-level-repository';

describe('PrismaLevelRepository', () => {
  it('should_ask_only_for_levels_of_the_given_game', async () => {
    // Arrange
    const findMany = jest.fn(() => Promise.resolve([{ id: 'level-1' }]));
    const client = { level: { findMany } } as unknown as LevelClient;

    // Act
    const ids = await new PrismaLevelRepository(client).existingIds(
      'hexa-sort',
      ['level-1', 'level-2'],
    );

    // Assert
    expect(ids).toEqual(new Set(['level-1']));
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: ['level-1', 'level-2'] }, gameId: 'hexa_sort' },
      select: { id: true },
    });
  });
});
