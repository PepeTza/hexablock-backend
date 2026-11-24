import { type GameId, isLevelGame } from '../../domain/game/game-id';
import { ApplicationError } from '../errors/application-error';
import { GAME_WITHOUT_LEVELS_MESSAGE } from '../errors/level-messages';
import type { ILevelCatalog, PublishedLevel } from '../ports/level-catalog';

/**
 * CU-15: the levels a device does not have yet, the ones after the last
 * `order` it knows. Without `after`, every level of the game.
 */
export class ListLevelsUseCase {
  constructor(private readonly catalog: ILevelCatalog) {}

  async execute(gameId: GameId, after = 0): Promise<PublishedLevel[]> {
    if (!isLevelGame(gameId)) {
      throw new ApplicationError('invalid', GAME_WITHOUT_LEVELS_MESSAGE);
    }
    return this.catalog.listAfter(gameId, after);
  }
}
