import type { Role } from '../../domain/user/role';
import type { User } from '../../domain/user/user';
import type { IClock } from '../ports/clock';
import type { ITokenService } from '../ports/token-service';

/** Tokens last 90 days (RNF-10, api-contracts §1). */
export const TOKEN_LIFETIME_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/** What register, login and refresh return (api-contracts §3). */
export interface AuthSession {
  readonly accessToken: string;
  readonly expiresAt: Date;
  readonly user: {
    readonly id: string;
    readonly username: string;
    readonly role: Role;
  };
}

/**
 * Builds the session the three auth use cases return, so the 90-day rule
 * and the token claims live in one place (SRP, no duplication).
 */
export class SessionIssuer {
  constructor(
    private readonly tokens: ITokenService,
    private readonly clock: IClock,
  ) {}

  async issueFor(user: User): Promise<AuthSession> {
    const expiresAt = new Date(
      this.clock.now().getTime() + TOKEN_LIFETIME_DAYS * DAY_MS,
    );
    const claims = {
      userId: user.id,
      username: user.username.value,
      role: user.role,
    };
    const accessToken = await this.tokens.issue(claims, expiresAt);
    return {
      accessToken,
      expiresAt,
      user: { id: user.id, username: claims.username, role: user.role },
    };
  }
}
