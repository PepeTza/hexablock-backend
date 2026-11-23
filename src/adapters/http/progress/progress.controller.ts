import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApplicationError } from '../../../application/errors/application-error';
import { INVALID_TOKEN_MESSAGE } from '../../../application/errors/auth-messages';
import { GetProgressUseCase } from '../../../application/use-cases/get-progress.use-case';
import { SyncProgressUseCase } from '../../../application/use-cases/sync-progress.use-case';
import { GAME_IDS, type GameId } from '../../../domain/game/game-id';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';
import { ErrorResponseDto } from '../errors/error-response.dto';
import { ParseGameIdPipe } from './parse-game-id.pipe';
import {
  PlayerProgressRequest,
  PlayerProgressResponse,
  ProgressListResponse,
  toPlayerProgressProps,
  toPlayerProgressResponse,
} from './progress.dto';

/**
 * Translates the progress endpoints (api-contracts §4) to the use cases and
 * back. Every route needs a player session (RN-35), checked by the guard.
 */
@ApiTags('progress')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Missing, invalid or expired token',
})
@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(
    private readonly getProgress: GetProgressUseCase,
    private readonly syncProgress: SyncProgressUseCase,
  ) {}

  /** CU-11 and CU-12: progress of every game the player has synced. */
  @Get()
  @ApiOkResponse({ type: ProgressListResponse })
  async list(
    @Req() request: AuthenticatedRequest,
  ): Promise<ProgressListResponse> {
    const stored = await this.getProgress.execute(userIdOf(request));
    return { progress: stored.map(toPlayerProgressResponse) };
  }

  /** CU-12: merges the device's progress with the server's (RN-36). */
  @Put(':gameId')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'gameId', enum: GAME_IDS })
  @ApiOkResponse({ type: PlayerProgressResponse })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async sync(
    @Req() request: AuthenticatedRequest,
    @Param('gameId', ParseGameIdPipe) gameId: GameId,
    @Body() body: PlayerProgressRequest,
  ): Promise<PlayerProgressResponse> {
    const stored = await this.syncProgress.execute({
      userId: userIdOf(request),
      gameId,
      progress: toPlayerProgressProps(body),
    });
    return toPlayerProgressResponse(stored);
  }
}

/** Always set by `JwtAuthGuard`; checked so the type has no `undefined`. */
function userIdOf(request: AuthenticatedRequest): string {
  if (!request.claims) {
    throw new ApplicationError('unauthorized', INVALID_TOKEN_MESSAGE);
  }
  return request.claims.userId;
}
