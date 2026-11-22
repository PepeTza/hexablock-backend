import { JwtService } from '@nestjs/jwt';

import { ApplicationError } from '../../application/errors/application-error';
import {
  ITokenService,
  TokenClaims,
} from '../../application/ports/token-service';
import { INVALID_TOKEN_MESSAGE } from '../../application/use-cases/refresh-token.use-case';
import { Role, ROLES } from '../../domain/user/role';

// Only HMAC-SHA256 is accepted, so a token cannot choose a weaker algorithm
// such as `none`.
const ALGORITHM = 'HS256';

/** Payload of the JWT as the contract names it (api-contracts §1). */
interface JwtPayload {
  readonly sub: string;
  readonly username: string;
  readonly role: Role;
  readonly exp: number;
}

/**
 * Adapter: implements `ITokenService` with signed JWTs. The secret is given
 * to `JwtService` by the module, from the `JWT_SECRET` variable.
 */
export class JwtTokenService implements ITokenService {
  constructor(private readonly jwt: JwtService) {}

  issue(claims: TokenClaims, expiresAt: Date): Promise<string> {
    const payload: JwtPayload = {
      sub: claims.userId,
      username: claims.username,
      role: claims.role,
      exp: Math.floor(expiresAt.getTime() / 1000),
    };
    return this.jwt.signAsync(payload, { algorithm: ALGORITHM });
  }

  async verify(token: string): Promise<TokenClaims> {
    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync<object>(token, {
        algorithms: [ALGORITHM],
      });
    } catch {
      throw invalidToken();
    }
    if (!isPayload(payload)) {
      throw invalidToken();
    }
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}

function invalidToken(): ApplicationError {
  return new ApplicationError('unauthorized', INVALID_TOKEN_MESSAGE);
}

/** A correctly signed token still needs the fields the API relies on. */
function isPayload(value: unknown): value is JwtPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { sub, username, role } = value as Record<string, unknown>;
  return (
    typeof sub === 'string' &&
    typeof username === 'string' &&
    ROLES.some((known) => known === role)
  );
}
