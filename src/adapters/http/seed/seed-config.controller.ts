import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { ApplicationError } from '../../../application/errors/application-error';
import { INVALID_TOKEN_MESSAGE } from '../../../application/errors/auth-messages';
import { ConfigureSeedUseCase } from '../../../application/use-cases/configure-seed.use-case';
import { GetSeedConfigUseCase } from '../../../application/use-cases/get-seed-config.use-case';
import { GAME_IDS, type GameId } from '../../../domain/game/game-id';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ErrorResponseDto } from '../errors/error-response.dto';
import { ParseGameIdPipe } from '../progress/parse-game-id.pipe';
import {
  GameSeedConfigResponse,
  LevelsSeedConfigResponse,
  type SeedConfigBody,
  toSeedConfigBody,
} from './seed-config-response.dto';
import {
  ConfigureSeedQuery,
  SeedConfigRequest,
  toSeedConfig,
} from './seed-config.dto';

const SEED_CONFIG_BODY = {
  oneOf: [
    { $ref: getSchemaPath(GameSeedConfigResponse) },
    { $ref: getSchemaPath(LevelsSeedConfigResponse) },
  ],
};

/** Translates the seed config endpoints (api-contracts §7). */
@ApiTags('seed-config')
@ApiExtraModels(GameSeedConfigResponse, LevelsSeedConfigResponse)
@Controller('seed-config')
export class SeedConfigController {
  constructor(
    private readonly getSeedConfig: GetSeedConfigUseCase,
    private readonly configureSeed: ConfigureSeedUseCase,
  ) {}

  /** CU-15: public; one config per game, or per level in Hexa Sort. */
  @Get(':gameId')
  @ApiParam({ name: 'gameId', enum: GAME_IDS })
  @ApiOkResponse({ schema: SEED_CONFIG_BODY })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'hexa-fit has no seed',
  })
  async get(
    @Param('gameId', ParseGameIdPipe) gameId: GameId,
  ): Promise<SeedConfigBody> {
    return toSeedConfigBody(await this.getSeedConfig.execute(gameId));
  }

  /** CU-18: an admin sets the config; Sort only returns the changed level. */
  @Put(':gameId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiParam({ name: 'gameId', enum: GAME_IDS })
  @ApiOkResponse({ schema: SEED_CONFIG_BODY })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid value, levelId misuse or hexa-fit',
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Not an admin' })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Unknown levelId',
  })
  async configure(
    @Req() request: AuthenticatedRequest,
    @Param('gameId', ParseGameIdPipe) gameId: GameId,
    @Query() query: ConfigureSeedQuery,
    @Body() body: SeedConfigRequest,
  ): Promise<SeedConfigBody> {
    if (!request.claims) {
      throw new ApplicationError('unauthorized', INVALID_TOKEN_MESSAGE);
    }
    const view = await this.configureSeed.execute({
      updatedBy: request.claims.userId,
      gameId,
      levelId: query.levelId ?? null,
      config: toSeedConfig(body),
    });
    return toSeedConfigBody(view);
  }
}
