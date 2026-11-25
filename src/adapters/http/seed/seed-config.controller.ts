import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import { GetSeedConfigUseCase } from '../../../application/use-cases/get-seed-config.use-case';
import { GAME_IDS, type GameId } from '../../../domain/game/game-id';
import { ErrorResponseDto } from '../errors/error-response.dto';
import { ParseGameIdPipe } from '../progress/parse-game-id.pipe';
import {
  GameSeedConfigResponse,
  LevelsSeedConfigResponse,
  type SeedConfigBody,
  toSeedConfigBody,
} from './seed-config-response.dto';

/** Translates the seed config endpoints (api-contracts §7). */
@ApiTags('seed-config')
@ApiExtraModels(GameSeedConfigResponse, LevelsSeedConfigResponse)
@Controller('seed-config')
export class SeedConfigController {
  constructor(private readonly getSeedConfig: GetSeedConfigUseCase) {}

  /** CU-15: public; one config per game, or per level in Hexa Sort. */
  @Get(':gameId')
  @ApiParam({ name: 'gameId', enum: GAME_IDS })
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(GameSeedConfigResponse) },
        { $ref: getSchemaPath(LevelsSeedConfigResponse) },
      ],
    },
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'hexa-fit has no seed',
  })
  async get(
    @Param('gameId', ParseGameIdPipe) gameId: GameId,
  ): Promise<SeedConfigBody> {
    return toSeedConfigBody(await this.getSeedConfig.execute(gameId));
  }
}
