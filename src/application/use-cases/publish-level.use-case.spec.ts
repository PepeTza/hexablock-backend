import type { GameId } from '../../domain/game/game-id';
import {
  type ILevelSpecValidator,
  LevelSpecValidators,
  type LevelSpecViolation,
} from '../../domain/level/level-spec-validator';
import type { SeedConfig } from '../../domain/seed/seed-config';
import type {
  ILevelCatalog,
  NewLevel,
  PublishedLevel,
} from '../ports/level-catalog';
import {
  type PublishLevelInput,
  PublishLevelUseCase,
} from './publish-level.use-case';

const ADMIN = 'admin-1';
const NOW = new Date('2026-11-24T10:00:00Z');
const RANDOM: SeedConfig = { mode: 'random' };

/** Fake catalog: appends in memory, numbering each game from 1. */
class InMemoryLevelCatalog implements ILevelCatalog {
  readonly published: NewLevel[] = [];

  publish(level: NewLevel): Promise<PublishedLevel> {
    this.published.push(level);
    const order = this.published.filter(
      (other) => other.gameId === level.gameId,
    ).length;
    return Promise.resolve({
      id: `level-${this.published.length}`,
      gameId: level.gameId,
      order,
      schemaVersion: level.schemaVersion,
      spec: level.spec,
      publishedAt: NOW,
    });
  }

  listAfter(): Promise<PublishedLevel[]> {
    return Promise.reject(new Error('not used by this use case'));
  }
}

/** A validator stub that reports the given violations for any spec. */
function stubValidator(
  gameId: GameId,
  violations: LevelSpecViolation[] = [],
): ILevelSpecValidator {
  return { gameId, schemaVersion: 1, validate: () => violations };
}

function setup(validators: ILevelSpecValidator[] = []) {
  const catalog = new InMemoryLevelCatalog();
  const useCase = new PublishLevelUseCase(
    catalog,
    new LevelSpecValidators(validators),
  );
  return { catalog, useCase };
}

function input(change: Partial<PublishLevelInput> = {}): PublishLevelInput {
  return {
    publishedBy: ADMIN,
    gameId: 'hexa-sort',
    schemaVersion: 1,
    spec: { goals: 5 },
    seedConfig: RANDOM,
    ...change,
  };
}

describe('PublishLevelUseCase', () => {
  it('should_publish_with_the_next_order_when_the_spec_is_valid', async () => {
    // Arrange
    const { catalog, useCase } = setup([stubValidator('hexa-sort')]);
    await useCase.execute(input());

    // Act
    const level = await useCase.execute(input());

    // Assert
    expect(level.order).toBe(2);
    expect(catalog.published[1]).toEqual({
      publishedBy: ADMIN,
      gameId: 'hexa-sort',
      schemaVersion: 1,
      spec: { goals: 5 },
      seedConfig: RANDOM,
    });
  });

  it.each<GameId>(['hexa-lines', 'hexa-merge'])(
    'should_reject_with_invalid_when_%s_has_no_levels',
    async (gameId) => {
      // Arrange
      const { catalog, useCase } = setup([stubValidator('hexa-sort')]);

      // Act
      const act = useCase.execute(input({ gameId, seedConfig: null }));

      // Assert
      await expect(act).rejects.toMatchObject({
        kind: 'invalid',
        message: 'this game has no levels',
      });
      expect(catalog.published).toEqual([]);
    },
  );

  it('should_reject_with_invalid_when_sort_has_no_seed_config', async () => {
    // Arrange
    const { useCase } = setup([stubValidator('hexa-sort')]);

    // Act
    const act = useCase.execute(input({ seedConfig: null }));

    // Assert
    await expect(act).rejects.toMatchObject({
      kind: 'invalid',
      message: 'seedConfig is required for this game',
    });
  });

  it('should_reject_with_invalid_when_fit_has_a_seed_config', async () => {
    // Arrange
    const { useCase } = setup([stubValidator('hexa-fit')]);

    // Act
    const act = useCase.execute(input({ gameId: 'hexa-fit' }));

    // Assert
    await expect(act).rejects.toMatchObject({
      kind: 'invalid',
      message: 'seedConfig is not allowed for this game',
    });
  });

  it('should_reject_with_unprocessable_when_the_schema_version_is_unknown', async () => {
    // Arrange: no validator for Hexa Fit yet, as in the server today.
    const { catalog, useCase } = setup([stubValidator('hexa-sort')]);

    // Act
    const act = useCase.execute(
      input({ gameId: 'hexa-fit', seedConfig: null }),
    );

    // Assert
    await expect(act).rejects.toMatchObject({
      kind: 'unprocessable',
      message: 'schemaVersion 1 is not supported for this game',
    });
    expect(catalog.published).toEqual([]);
  });

  it('should_reject_with_unprocessable_naming_every_field_when_the_spec_breaks_rules', async () => {
    // Arrange
    const { catalog, useCase } = setup([
      stubValidator('hexa-sort', [
        { field: 'spec.goals', issue: 'must be an integer from 1 to 99' },
        { field: 'spec.blocked[0]', issue: 'is outside the board' },
      ]),
    ]);

    // Act
    const act = useCase.execute(input());

    // Assert
    await expect(act).rejects.toMatchObject({
      kind: 'unprocessable',
      message:
        'spec.goals must be an integer from 1 to 99; spec.blocked[0] is outside the board',
    });
    expect(catalog.published).toEqual([]);
  });
});
