import { GameId as GameIdColumn } from '@prisma/client';

import type { GameId } from '../../domain/game/game-id';

// Prisma names enum members with underscores; the database and the domain
// use the contract's hyphens (`hexa-lines`).
const TO_COLUMN: Record<GameId, GameIdColumn> = {
  'hexa-lines': GameIdColumn.hexa_lines,
  'hexa-fit': GameIdColumn.hexa_fit,
  'hexa-sort': GameIdColumn.hexa_sort,
  'hexa-merge': GameIdColumn.hexa_merge,
};

const FROM_COLUMN: Record<GameIdColumn, GameId> = {
  hexa_lines: 'hexa-lines',
  hexa_fit: 'hexa-fit',
  hexa_sort: 'hexa-sort',
  hexa_merge: 'hexa-merge',
};

/** The Prisma enum member of a domain `GameId`. */
export function toGameIdColumn(gameId: GameId): GameIdColumn {
  return TO_COLUMN[gameId];
}

/** The domain `GameId` of a Prisma enum member. */
export function fromGameIdColumn(column: GameIdColumn): GameId {
  return FROM_COLUMN[column];
}
