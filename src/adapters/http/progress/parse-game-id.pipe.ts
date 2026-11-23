import { BadRequestException, PipeTransform } from '@nestjs/common';

import { GAME_IDS, type GameId, isGameId } from '../../../domain/game/game-id';

/**
 * Checks the `{gameId}` of a path: any value other than the four games is a
 * `400` in the contract's format (api-contracts §1, `gameId` values).
 */
export class ParseGameIdPipe implements PipeTransform<string, GameId> {
  transform(value: string): GameId {
    if (!isGameId(value)) {
      throw new BadRequestException({
        message: `gameId must be one of ${GAME_IDS.join(', ')}`,
        details: [{ field: 'gameId', issue: 'in' }],
      });
    }
    return value;
  }
}
