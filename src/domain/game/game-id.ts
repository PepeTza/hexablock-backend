/** The four variants of the suite (api-contracts §1, `gameId` values). */
export const GAME_IDS = [
  'hexa-lines',
  'hexa-fit',
  'hexa-sort',
  'hexa-merge',
] as const;
export type GameId = (typeof GAME_IDS)[number];

const LEVEL_GAMES: readonly GameId[] = ['hexa-fit', 'hexa-sort'];

/** `true` for the variants played by levels; the others are endless. */
export function isLevelGame(gameId: GameId): boolean {
  return LEVEL_GAMES.includes(gameId);
}

/** Narrows any value to a `GameId`, for input read from outside. */
export function isGameId(value: unknown): value is GameId {
  return GAME_IDS.some((gameId) => gameId === value);
}
