import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { ApplicationError } from '../../../application/errors/application-error';
import { INVALID_TOKEN_MESSAGE } from '../../../application/errors/auth-messages';
import { LoginUseCase } from '../../../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../../application/use-cases/refresh-token.use-case';
import { RegisterUserUseCase } from '../../../application/use-cases/register-user.use-case';
import { ErrorResponseDto } from '../errors/error-response.dto';
import { AuthSessionResponse, toAuthSessionResponse } from './auth-session.dto';
import { LoginRequest, RegisterRequest } from './credentials.dto';
import { type AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard';
import { AUTH_RATE_LIMIT } from './auth-rate-limit';
import { LoginThrottlerGuard } from './login-throttler.guard';

const AUTH_THROTTLE = { default: AUTH_RATE_LIMIT };

/**
 * Translates the auth endpoints (api-contracts §3) to the use cases and back.
 * It holds no rules: validation is in the DTOs, access and rate limits in
 * guards, and the logic in the use cases.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly logIn: LoginUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
  ) {}

  /** CU-10. Limited per IP. */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @ApiCreatedResponse({ type: AuthSessionResponse })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Name taken' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  async register(@Body() body: RegisterRequest): Promise<AuthSessionResponse> {
    return toAuthSessionResponse(await this.registerUser.execute(body));
  }

  /** CU-11. Limited per username and IP. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Wrong username or password',
  })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  async login(@Body() body: LoginRequest): Promise<AuthSessionResponse> {
    return toAuthSessionResponse(await this.logIn.execute(body));
  }

  /** CU-11, automatic renewal. Needs a valid token. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing, invalid or expired token',
  })
  async refresh(
    @Req() request: AuthenticatedRequest,
  ): Promise<AuthSessionResponse> {
    // Always set by JwtAuthGuard; checked so the type has no `undefined`.
    if (!request.claims) {
      throw new ApplicationError('unauthorized', INVALID_TOKEN_MESSAGE);
    }
    const session = await this.refreshToken.execute({
      userId: request.claims.userId,
    });
    return toAuthSessionResponse(session);
  }
}
