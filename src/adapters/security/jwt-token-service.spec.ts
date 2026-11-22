import { JwtService } from '@nestjs/jwt';

import { ApplicationError } from '../../application/errors/application-error';
import { JwtTokenService } from './jwt-token-service';

const SECRET = 'test-secret-that-is-at-least-32-chars';
const CLAIMS = {
  userId: 'user-1',
  username: 'ronald_g',
  role: 'player' as const,
};
const IN_ONE_HOUR = (): Date => new Date(Date.now() + 60 * 60 * 1000);
const INVALID_TOKEN = new ApplicationError(
  'unauthorized',
  'invalid or expired token',
);

describe('JwtTokenService', () => {
  it('should_put_sub_username_and_role_in_the_token_payload', async () => {
    // Arrange
    const jwt = new JwtService({ secret: SECRET });
    const service = new JwtTokenService(jwt);
    const expiresAt = IN_ONE_HOUR();

    // Act
    const token = await service.issue(CLAIMS, expiresAt);

    // Assert
    expect(jwt.decode(token)).toMatchObject({
      sub: 'user-1',
      username: 'ronald_g',
      role: 'player',
      exp: Math.floor(expiresAt.getTime() / 1000),
    });
    await expect(service.verify(token)).resolves.toEqual(CLAIMS);
  });

  it.each([
    [
      'expired',
      (s: JwtTokenService) => s.issue(CLAIMS, new Date(Date.now() - 60 * 1000)),
    ],
    [
      'tampered',
      async (s: JwtTokenService) => `${await s.issue(CLAIMS, IN_ONE_HOUR())}x`,
    ],
    [
      'signed with another secret',
      () =>
        new JwtTokenService(
          new JwtService({ secret: 'another-secret-of-at-least-32-chars' }),
        ).issue(CLAIMS, IN_ONE_HOUR()),
    ],
    [
      'carrying an unknown role',
      () =>
        new JwtService({ secret: SECRET }).signAsync({
          sub: 'user-1',
          username: 'ronald_g',
          role: 'superuser',
          exp: Math.floor(IN_ONE_HOUR().getTime() / 1000),
        }),
    ],
    [
      'without an expiry',
      () =>
        new JwtService({ secret: SECRET }).signAsync({
          sub: 'user-1',
          username: 'ronald_g',
          role: 'player',
        }),
    ],
    ['malformed', () => Promise.resolve('not-a-token')],
  ])(
    'should_throw_unauthorized_when_the_token_is_expired_or_tampered (%s)',
    async (_case, makeToken) => {
      // Arrange
      const service = new JwtTokenService(new JwtService({ secret: SECRET }));
      const token = await makeToken(service);

      // Act
      const verify = service.verify(token);

      // Assert
      await expect(verify).rejects.toEqual(INVALID_TOKEN);
    },
  );
});
