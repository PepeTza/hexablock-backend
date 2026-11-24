import type { GameId } from '../game/game-id';

/** One reason a level `spec` breaks its format (api-contracts §6). */
export interface LevelSpecViolation {
  /** Path of the field, e.g. `spec.tray.maxHeight`. */
  readonly field: string;
  /** What is wrong, in plain words, e.g. `must be an integer from 1 to 9`. */
  readonly issue: string;
}

/**
 * Strategy: checks the format of one variant's `spec` in one schema
 * version. It returns every violation instead of throwing, so callers
 * decide by the result, never by an error's class.
 */
export interface ILevelSpecValidator {
  readonly gameId: GameId;
  readonly schemaVersion: number;
  validate(spec: unknown): readonly LevelSpecViolation[];
}

/**
 * The validators the server knows, looked up by game and schema version.
 * A new variant or schema version is one more validator in the list given
 * by the composition root; nothing here changes (OCP).
 */
export class LevelSpecValidators {
  private readonly byKey: ReadonlyMap<string, ILevelSpecValidator>;

  constructor(validators: readonly ILevelSpecValidator[]) {
    const byKey = new Map<string, ILevelSpecValidator>();
    for (const validator of validators) {
      const key = keyOf(validator.gameId, validator.schemaVersion);
      if (byKey.has(key)) {
        throw new Error(`Two level spec validators for ${key}`);
      }
      byKey.set(key, validator);
    }
    this.byKey = byKey;
  }

  /** The validator for this game and version, or `undefined` if unknown. */
  find(gameId: GameId, schemaVersion: number): ILevelSpecValidator | undefined {
    return this.byKey.get(keyOf(gameId, schemaVersion));
  }
}

function keyOf(gameId: GameId, schemaVersion: number): string {
  return `${gameId}@${schemaVersion}`;
}
