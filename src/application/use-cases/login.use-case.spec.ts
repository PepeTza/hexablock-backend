import { User } from '../../domain/user/user';
import { InvalidUsernameError, Username } from '../../domain/user/username';
import { ApplicationError } from '../errors/application-error';
import { IClock } from '../ports/clock';
import { IPasswordHasher } from '../ports/password-hasher';
import { ITokenService, TokenClaims } from '../ports/token-service';
import { IUserRepository } from '../ports/user-repository';
import { LoginUseCase } from './login.use-case';
import { SessionIssuer } from './session-issuer';

/** Fake of the repository with one stored player. */
class InMemoryUserRepository implements IUserRepository {
  readonly stored = [
    User.restore({
      id: 'user-1',
      username: Username.create('ronald_g'),
      passwordHash: 'hashed:s3cretPass',
      role: 'player',
    }),
  ];

  findByUsername(username: Username): Promise<User | null> {
    const user = this.stored.find((u) => u.username.equals(username));
    return Promise.resolve(user ?? null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.stored.find((u) => u.id === id) ?? null);
  }

  create(): Promise<User> {
    return Promise.reject(new Error('not used by this use case'));
  }
}

/** Fake of the hasher; records the hashes it was asked to compare. */
class FakePasswordHasher implements IPasswordHasher {
  readonly compared: (string | null)[] = [];

  hash(password: string): Promise<string> {
    return Promise.resolve(`hashed:${password}`);
  }

  matches(password: string, hash: string | null): Promise<boolean> {
    this.compared.push(hash);
    return Promise.resolve(hash === `hashed:${password}`);
  }
}

class FakeTokenService implements ITokenService {
  issue(claims: TokenClaims): Promise<string> {
    return Promise.resolve(`token-for-${claims.userId}`);
  }

  verify(): Promise<TokenClaims> {
    return Promise.reject(new Error('not used by this use case'));
  }
}

const fixedClock: IClock = { now: () => new Date('2026-11-22T10:00:00Z') };

function setUp(): { useCase: LoginUseCase; hasher: FakePasswordHasher } {
  const hasher = new FakePasswordHasher();
  const sessions = new SessionIssuer(new FakeTokenService(), fixedClock);
  const useCase = new LoginUseCase(
    new InMemoryUserRepository(),
    hasher,
    sessions,
  );
  return { useCase, hasher };
}

describe('LoginUseCase', () => {
  it('should_return_a_session_when_the_credentials_are_right', async () => {
    // Arrange
    const { useCase } = setUp();

    // Act
    const session = await useCase.execute({
      username: 'Ronald_G',
      password: 's3cretPass',
    });

    // Assert
    expect(session.accessToken).toBe('token-for-user-1');
    expect(session.user).toEqual({
      id: 'user-1',
      username: 'ronald_g',
      role: 'player',
    });
  });

  it.each([
    ['the user does not exist', 'nobody_here', 's3cretPass'],
    ['the password is wrong', 'ronald_g', 'wrongPass1'],
    ['the name breaks the format', 'ro', 's3cretPass'],
  ])(
    'should_throw_the_same_unauthorized_error_when_the_user_does_not_exist_or_the_password_is_wrong (%s)',
    async (_case, username, password) => {
      // Arrange
      const { useCase, hasher } = setUp();

      // Act
      const login = useCase.execute({ username, password });

      // Assert
      await expect(login).rejects.toEqual(
        new ApplicationError('unauthorized', 'invalid username or password'),
      );
      // A password is always compared, so the time spent is the same.
      expect(hasher.compared).toHaveLength(1);
    },
  );

  it('should_surface_the_error_when_a_stored_username_is_corrupt', async () => {
    // Arrange: the repository fails to rebuild a stored row.
    const corrupt = new InvalidUsernameError();
    const users = new InMemoryUserRepository();
    users.findByUsername = (): Promise<User | null> => Promise.reject(corrupt);
    const useCase = new LoginUseCase(
      users,
      new FakePasswordHasher(),
      new SessionIssuer(new FakeTokenService(), fixedClock),
    );

    // Act
    const login = useCase.execute({
      username: 'ronald_g',
      password: 's3cretPass',
    });

    // Assert: corrupt data is an error, not a hidden "wrong password".
    await expect(login).rejects.toBe(corrupt);
  });
});
