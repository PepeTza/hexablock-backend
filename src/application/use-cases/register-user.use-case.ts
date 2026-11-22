import { User } from '../../domain/user/user';
import { Username } from '../../domain/user/username';
import { ApplicationError } from '../errors/application-error';
import type { IPasswordHasher } from '../ports/password-hasher';
import type { IUserRepository } from '../ports/user-repository';
import type { Credentials } from './credentials';
import type { AuthSession, SessionIssuer } from './session-issuer';

export const USERNAME_TAKEN_MESSAGE = 'username already taken';

/** CU-10: creates a player account and starts its session. */
export class RegisterUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(credentials: Credentials): Promise<AuthSession> {
    const username = Username.create(credentials.username);
    if (await this.users.findByUsername(username)) {
      throw new ApplicationError('conflict', USERNAME_TAKEN_MESSAGE);
    }

    const passwordHash = await this.hasher.hash(credentials.password);
    const user = await this.users.create(User.register(username, passwordHash));
    return this.sessions.issueFor(user);
  }
}
