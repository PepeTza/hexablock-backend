import { NewUser, User } from '../../domain/user/user';
import { Username } from '../../domain/user/username';
import { ApplicationError } from '../errors/application-error';
import { IClock } from '../ports/clock';
import { IPasswordHasher } from '../ports/password-hasher';
import { ITokenService, TokenClaims } from '../ports/token-service';
import { IUserRepository } from '../ports/user-repository';
import { RegisterUserUseCase } from './register-user.use-case';
import { SessionIssuer } from './session-issuer';

const NOW = new Date('2026-11-22T10:00:00.000Z');

/** Fake of the repository: keeps users in an array. */
class InMemoryUserRepository implements IUserRepository {
  readonly stored: User[] = [];

  findByUsername(username: Username): Promise<User | null> {
    const user = this.stored.find((u) => u.username.equals(username));
    return Promise.resolve(user ?? null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.stored.find((u) => u.id === id) ?? null);
  }

  create(newUser: NewUser): Promise<User> {
    const user = User.restore({
      ...newUser,
      id: `user-${this.stored.length + 1}`,
    });
    this.stored.push(user);
    return Promise.resolve(user);
  }
}

/** Fake of the hasher: a readable "hash" that is never the plain password. */
class FakePasswordHasher implements IPasswordHasher {
  hash(password: string): Promise<string> {
    return Promise.resolve(`hashed:${password}`);
  }

  matches(password: string, hash: string | null): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${password}`);
  }
}

/** Fake of the token service: records what it was asked to sign. */
class FakeTokenService implements ITokenService {
  readonly issued: { claims: TokenClaims; expiresAt: Date }[] = [];

  issue(claims: TokenClaims, expiresAt: Date): Promise<string> {
    this.issued.push({ claims, expiresAt });
    return Promise.resolve(`token-${this.issued.length}`);
  }

  verify(): Promise<TokenClaims> {
    return Promise.reject(new Error('not used by this use case'));
  }
}

const fixedClock: IClock = { now: () => NOW };

function setUp(): {
  useCase: RegisterUserUseCase;
  users: InMemoryUserRepository;
  tokens: FakeTokenService;
} {
  const users = new InMemoryUserRepository();
  const tokens = new FakeTokenService();
  const sessions = new SessionIssuer(tokens, fixedClock);
  const useCase = new RegisterUserUseCase(
    users,
    new FakePasswordHasher(),
    sessions,
  );
  return { useCase, users, tokens };
}

describe('RegisterUserUseCase', () => {
  it('should_return_a_session_when_registering_a_new_username', async () => {
    // Arrange
    const { useCase } = setUp();

    // Act
    const session = await useCase.execute({
      username: 'Ronald_G',
      password: 's3cretPass',
    });

    // Assert
    expect(session.accessToken).toBe('token-1');
    expect(session.user).toEqual({
      id: 'user-1',
      username: 'ronald_g',
      role: 'player',
    });
  });

  it('should_store_only_the_hash_when_registering', async () => {
    // Arrange
    const { useCase, users } = setUp();

    // Act
    await useCase.execute({ username: 'ronald_g', password: 's3cretPass' });

    // Assert
    expect(users.stored[0]?.passwordHash).toBe('hashed:s3cretPass');
  });

  it('should_throw_conflict_when_the_username_is_taken', async () => {
    // Arrange
    const { useCase } = setUp();
    await useCase.execute({ username: 'ronald_g', password: 's3cretPass' });

    // Act
    const again = useCase.execute({
      username: 'RONALD_G',
      password: 'otherPass1',
    });

    // Assert
    await expect(again).rejects.toEqual(
      new ApplicationError('conflict', 'username already taken'),
    );
  });

  it('should_expire_the_token_90_days_after_now', async () => {
    // Arrange
    const { useCase, tokens } = setUp();
    const in90Days = new Date('2027-02-20T10:00:00.000Z');

    // Act
    const session = await useCase.execute({
      username: 'ronald_g',
      password: 's3cretPass',
    });

    // Assert
    expect(session.expiresAt).toEqual(in90Days);
    expect(tokens.issued[0]).toEqual({
      claims: { userId: 'user-1', username: 'ronald_g', role: 'player' },
      expiresAt: in90Days,
    });
  });
});
