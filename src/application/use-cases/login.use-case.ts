import type { User } from '../../domain/user/user';
import { InvalidUsernameError, Username } from '../../domain/user/username';
import { ApplicationError } from '../errors/application-error';
import type { IPasswordHasher } from '../ports/password-hasher';
import type { IUserRepository } from '../ports/user-repository';
import type { Credentials } from './credentials';
import type { AuthSession, SessionIssuer } from './session-issuer';

/** The only message of a failed login (CU-11 A1). */
export const INVALID_CREDENTIALS_MESSAGE = 'invalid username or password';

/**
 * CU-11: checks the password and starts a session. Every failure gives the
 * same error, so a client cannot learn whether the username exists.
 */
export class LoginUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(credentials: Credentials): Promise<AuthSession> {
    const user = await this.findUser(credentials.username);
    // Compares even when there is no user, so the time spent is the same.
    const valid = await this.hasher.matches(
      credentials.password,
      user?.passwordHash ?? null,
    );
    if (!user || !valid) {
      throw new ApplicationError('unauthorized', INVALID_CREDENTIALS_MESSAGE);
    }
    return this.sessions.issueFor(user);
  }

  /** A name that breaks the format cannot exist, so it is just "not found". */
  private async findUser(raw: string): Promise<User | null> {
    try {
      return await this.users.findByUsername(Username.create(raw));
    } catch (error) {
      if (error instanceof InvalidUsernameError) {
        return null;
      }
      throw error;
    }
  }
}
