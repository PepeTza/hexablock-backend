import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { ApplicationError } from '../../../application/errors/application-error';
import { INVALID_TOKEN_MESSAGE } from '../../../application/errors/auth-messages';
import { ListLevelsUseCase } from '../../../application/use-cases/list-levels.use-case';
import { PublishLevelUseCase } from '../../../application/use-cases/publish-level.use-case';
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
  LevelDefinitionResponse,
  LevelListResponse,
  ListLevelsQuery,
  PublishLevelRequest,
  toLevelDefinitionResponse,
  toSeedConfig,
} from './level.dto';

/** Translates the level endpoints (api-contracts §6) to the use cases. */
@ApiTags('levels')
@Controller('levels')
export class LevelsController {
  constructor(
    private readonly listLevels: ListLevelsUseCase,
    private readonly publishLevel: PublishLevelUseCase,
  ) {}

  /** CU-15: public; the levels after the last `order` the device has. */
  @Get(':gameId')
  @ApiParam({ name: 'gameId', enum: GAME_IDS })
  @ApiOkResponse({ type: LevelListResponse })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'A game without levels or an invalid after',
  })
  async list(
    @Param('gameId', ParseGameIdPipe) gameId: GameId,
    @Query() query: ListLevelsQuery,
  ): Promise<LevelListResponse> {
    const levels = await this.listLevels.execute(gameId, query.after);
    return { levels: levels.map(toLevelDefinitionResponse) };
  }

  /** CU-17: an admin appends a level at the end of the game's order. */
  @Post(':gameId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiParam({ name: 'gameId', enum: GAME_IDS })
  @ApiCreatedResponse({ type: LevelDefinitionResponse })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Not an admin' })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'The spec does not match its schema; message names the field',
  })
  async publish(
    @Req() request: AuthenticatedRequest,
    @Param('gameId', ParseGameIdPipe) gameId: GameId,
    @Body() body: PublishLevelRequest,
  ): Promise<LevelDefinitionResponse> {
    if (!request.claims) {
      throw new ApplicationError('unauthorized', INVALID_TOKEN_MESSAGE);
    }
    const level = await this.publishLevel.execute({
      publishedBy: request.claims.userId,
      gameId,
      schemaVersion: body.schemaVersion,
      spec: body.spec,
      seedConfig: toSeedConfig(body.seedConfig),
    });
    return toLevelDefinitionResponse(level);
  }
}
