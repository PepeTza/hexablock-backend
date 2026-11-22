import { User } from '../../domain/user/user';
import { Username } from '../../domain/user/username';
import { ApplicationError } from '../errors/application-error';
import { IClock } from '../ports/clock';
import { ITokenService, TokenClaims } from '../ports/token-service';
import { IUserRepository } from '../ports/user-repository';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { SessionIssuer } from './session-issuer';

/** Fake of the repository whose only user is now an administrator. */
class InMemoryUserRepository implements IUserRepository {
  readonly stored = [
    User.restore({
      id: 'user-1',
      username: Username.create('ronald_g'),
      passwordHash: 'hashed:s3cretPass',
      role: 'admin',
    }),
  ];

  findByUsername(): Promise<User | null> {
    return Promise.reject(new Error('not used by this use case'));
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.stored.find((u) => u.id === id) ?? null);
  }

  create(): Promise<User> {
    return Promise.reject(new Error('not used by this use case'));
  }
}

class FakeTokenService implements ITokenService {
  readonly issued: TokenClaims[] = [];

  issue(claims: TokenClaims): Promise<string> {
    this.issued.push(claims);
    return Promise.resolve('new-token');
  }

  verify(): Promise<TokenClaims> {
    return Promise.reject(new Error('not used by this use case'));
  }
}

const fixedClock: IClock = { now: () => new Date('2026-11-22T10:00:00Z') };

function setUp(): { useCase: RefreshTokenUseCase; tokens: FakeTokenService } {
  const tokens = new FakeTokenService();
  const useCase = new RefreshTokenUseCase(
    new InMemoryUserRepository(),
    new SessionIssuer(tokens, fixedClock),
  );
  return { useCase, tokens };
}

describe('RefreshTokenUseCase', () => {
  it('should_issue_a_new_token_with_the_current_role_when_refreshing', async () => {
    // Arrange
    const { useCase, tokens } = setUp();

    // Act
    const session = await useCase.execute({ userId: 'user-1' });

    // Assert
    expect(session.accessToken).toBe('new-token');
    expect(tokens.issued[0]?.role).toBe('admin');
  });

  it('should_throw_unauthorized_when_refreshing_for_a_user_that_no_longer_exists', async () => {
    // Arrange
    const { useCase } = setUp();

    // Act
    const refresh = useCase.execute({ userId: 'deleted-user' });

    // Assert
    await expect(refresh).rejects.toEqual(
      new ApplicationError('unauthorized', 'invalid or expired token'),
    );
  });
});
