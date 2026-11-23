import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

import { ApplicationError } from '../../../application/errors/application-error';
import { INVALID_TOKEN_MESSAGE } from '../../../application/errors/auth-messages';
import { SubmitScoreUseCase } from '../../../application/use-cases/submit-score.use-case';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';
import { ErrorResponseDto } from '../errors/error-response.dto';
import {
  SubmitScoreRequest,
  SubmitScoreResponse,
  toScoreClaimProps,
  toSubmitScoreResponse,
} from './score.dto';
import { SCORE_RATE_LIMIT } from './score-rate-limit';
import { ScoreThrottlerGuard } from './score-throttler.guard';

/**
 * Translates `POST /scores` (api-contracts §5) to the use case and back.
 * The JWT guard runs first, so the rate limit can count per player.
 */
@ApiTags('scores')
@ApiBearerAuth()
@Controller('scores')
export class ScoresController {
  constructor(private readonly submitScore: SubmitScoreUseCase) {}

  /** CU-13: submits the score of a finished game. */
  @Post()
  @UseGuards(JwtAuthGuard, ScoreThrottlerGuard)
  @Throttle({ default: SCORE_RATE_LIMIT })
  @ApiCreatedResponse({ type: SubmitScoreResponse })
  @ApiOkResponse({
    type: SubmitScoreResponse,
    description: 'This sessionId was already accepted',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'Implausible score: logged, never ranked',
  })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  async submit(
    @Req() request: AuthenticatedRequest,
    @Body() body: SubmitScoreRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SubmitScoreResponse> {
    if (!request.claims) {
      throw new ApplicationError('unauthorized', INVALID_TOKEN_MESSAGE);
    }
    const result = await this.submitScore.execute({
      userId: request.claims.userId,
      sessionId: body.sessionId,
      claim: toScoreClaimProps(body),
    });
    response.status(result.replayed ? HttpStatus.OK : HttpStatus.CREATED);
    return toSubmitScoreResponse(result.outcome);
  }
}
