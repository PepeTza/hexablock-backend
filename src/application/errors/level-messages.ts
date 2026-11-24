// Messages of the level errors (api-contracts §6), shared by the use cases.

export const GAME_WITHOUT_LEVELS_MESSAGE = 'this game has no levels';

export const SEED_CONFIG_REQUIRED_MESSAGE =
  'seedConfig is required for this game';

export const SEED_CONFIG_NOT_ALLOWED_MESSAGE =
  'seedConfig is not allowed for this game';

/** The `schemaVersion` has no validator for this game. */
export function unknownSchemaMessage(schemaVersion: number): string {
  return `schemaVersion ${schemaVersion} is not supported for this game`;
}
