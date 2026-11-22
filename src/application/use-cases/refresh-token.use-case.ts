import { ApplicationError } from '../errors/application-error';
import type { IUserRepository } from '../ports/user-repository';
import type { AuthSession, SessionIssuer } from './session-issuer';

/** Message of every rejected token (api-contracts §3, refresh). */
export const INVALID_TOKEN_MESSAGE = 'invalid or expired token';

export interface RefreshInput {
  /** Owner of the token, already verified by the JWT guard. */
  readonly userId: string;
}

/**
 * CU-11, automatic renewal: issues a new 90-day token. The user is read
 * again, so a deleted account is rejected and a changed role is applied.
 */
export class RefreshTokenUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(input: RefreshInput): Promise<AuthSession> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new ApplicationError('unauthorized', INVALID_TOKEN_MESSAGE);
    }
    return this.sessions.issueFor(user);
  }
}
