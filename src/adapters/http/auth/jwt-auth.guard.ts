import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { ApplicationError } from '../../../application/errors/application-error';
import { INVALID_TOKEN_MESSAGE } from '../../../application/errors/auth-messages';
import type {
  ITokenService,
  TokenClaims,
} from '../../../application/ports/token-service';
import { TOKEN_SERVICE } from './auth.tokens';

/** A request that passed `JwtAuthGuard`: it carries its token's claims. */
export interface AuthenticatedRequest extends Request {
  claims?: TokenClaims;
}

/**
 * Aspect (guard): the "player" access level of the contract. Lets the request
 * through only with a valid `Authorization: Bearer <JWT>` and attaches the
 * token's claims to it; anything else is a `401`. Controllers and use cases
 * never check tokens themselves.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: ITokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request.headers.authorization);
    if (token === null) {
      throw new ApplicationError('unauthorized', INVALID_TOKEN_MESSAGE);
    }
    request.claims = await this.tokens.verify(token);
    return true;
  }
}

/** The token of an `Authorization: Bearer <token>` header, or `null`. */
function bearerToken(header: string | undefined): string | null {
  const [scheme, token] = header?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}
