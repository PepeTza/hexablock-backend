import type { Role } from '../../domain/user/role';

/** What a token says about its owner (api-contracts §1, authentication). */
export interface TokenClaims {
  readonly userId: string;
  readonly username: string;
  readonly role: Role;
}

/** Port: signs and checks access tokens. The adapter uses JWT. */
export interface ITokenService {
  issue(claims: TokenClaims, expiresAt: Date): Promise<string>;
  /**
   * Returns the claims of a valid token. Throws
   * `ApplicationError('unauthorized')` when it is expired, tampered with or
   * malformed.
   */
  verify(token: string): Promise<TokenClaims>;
}
