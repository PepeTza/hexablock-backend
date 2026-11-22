import type { User } from '../../domain/user/user';
import { InvalidUsernameError, Username } from '../../domain/user/username';
import { ApplicationError } from '../errors/application-error';
import { INVALID_CREDENTIALS_MESSAGE } from '../errors/auth-messages';
import type { IPasswordHasher } from '../ports/password-hasher';
import type { IUserRepository } from '../ports/user-repository';
import type { Credentials } from './credentials';
import type { AuthSession, SessionIssuer } from './session-issuer';

/**
 * CU-11: checks the password and starts a session. Every failure gives the
 * same error and takes the same time, so a client cannot learn whether the
 * username exists. Source: OWASP, "Authentication Cheat Sheet", section
 * "Authentication and Error Messages":
 * https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
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

  /**
   * A typed name that breaks the format cannot exist, so it is just "not
   * found". Only the player's input is caught here: an invalid name read
   * from storage is corrupt data and must surface as an error, not a 401.
   */
  private async findUser(raw: string): Promise<User | null> {
    let username: Username;
    try {
      username = Username.create(raw);
    } catch (error) {
      if (error instanceof InvalidUsernameError) {
        return null;
      }
      throw error;
    }
    return this.users.findByUsername(username);
  }
}
