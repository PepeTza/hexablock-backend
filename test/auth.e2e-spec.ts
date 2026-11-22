import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { PrismaService } from '../src/frameworks/prisma/prisma.service';
import { createTestApp } from './create-test-app';

// Every user this file creates starts with this prefix, so it can delete them.
const PREFIX = 'e2e_auth_';
const PASSWORD = 's3cretPass';

/** A unique username for each test, within the 20-character limit. */
function uniqueName(): string {
  return `${PREFIX}${Math.random().toString(36).slice(2, 10)}`;
}

describe('Auth (e2e)', () => {
  let app: NestExpressApplication | undefined;

  // A new app per test also gives each test fresh rate-limit counters.
  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    // If the app failed to start, let that error show instead of a new one.
    if (!app) {
      return;
    }
    await app
      .get(PrismaService)
      .user.deleteMany({ where: { username: { startsWith: PREFIX } } });
    await app.close();
    app = undefined;
  });

  function server(): ReturnType<NestExpressApplication['getHttpServer']> {
    if (!app) {
      throw new Error('The test app did not start');
    }
    return app.getHttpServer();
  }

  function post(path: string, body: object): request.Test {
    return request(server()).post(`/api/v1/auth/${path}`).send(body);
  }

  it('should_return_201_and_a_token_when_registering', async () => {
    // Arrange
    const username = uniqueName();

    // Act
    const response = await post('register', {
      username: username.toUpperCase(),
      password: PASSWORD,
    });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      accessToken: expect.any(String) as string,
      expiresAt: expect.stringMatching(/Z$/) as string,
      user: { id: expect.any(String) as string, username, role: 'player' },
    });
  });

  it('should_return_409_when_registering_a_taken_username_in_other_case', async () => {
    // Arrange
    const username = uniqueName();
    await post('register', { username, password: PASSWORD }).expect(201);

    // Act
    const response = await post('register', {
      username: username.toUpperCase(),
      password: 'otherPass1',
    });

    // Assert
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      statusCode: 409,
      message: 'username already taken',
    });
  });

  it('should_return_400_with_details_when_the_password_has_more_than_72_bytes', async () => {
    // Arrange: 40 characters, but 80 bytes, since each 'ñ' takes 2 in UTF-8.
    const password = 'ñ'.repeat(40);

    // Act
    const response = await post('register', {
      username: uniqueName(),
      password,
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      details: [{ field: 'password', issue: 'byteLength' }],
    });
  });

  it('should_return_200_when_logging_in_with_the_right_password', async () => {
    // Arrange
    const username = uniqueName();
    await post('register', { username, password: PASSWORD }).expect(201);

    // Act
    const response = await post('login', { username, password: PASSWORD });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ user: { username, role: 'player' } });
  });

  it('should_return_401_with_a_generic_message_when_the_password_is_wrong', async () => {
    // Arrange
    const username = uniqueName();
    await post('register', { username, password: PASSWORD }).expect(201);

    // Act
    const wrongPassword = await post('login', {
      username,
      password: 'wrongPass1',
    });
    const unknownUser = await post('login', {
      username: uniqueName(),
      password: PASSWORD,
    });

    // Assert: both failures look exactly the same to the client.
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body).toMatchObject({
      message: 'invalid username or password',
    });
    expect(unknownUser.status).toBe(401);
    expect(unknownUser.body).toMatchObject({
      message: 'invalid username or password',
    });
  });

  it('should_return_429_with_retry_after_on_the_sixth_login_attempt_in_a_minute', async () => {
    // Arrange
    const username = uniqueName();
    for (let attempt = 1; attempt <= 5; attempt++) {
      await post('login', { username, password: 'wrongPass1' }).expect(401);
    }

    // Act
    const response = await post('login', { username, password: 'wrongPass1' });

    // Assert
    expect(response.status).toBe(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(response.body).toMatchObject({
      statusCode: 429,
      message: 'too many requests',
    });
  });

  it('should_return_200_with_a_new_token_when_refreshing_with_a_valid_token', async () => {
    // Arrange
    const username = uniqueName();
    const registered = await post('register', {
      username,
      password: PASSWORD,
    }).expect(201);
    const { accessToken } = registered.body as { accessToken: string };

    // Act
    const response = await request(server())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${accessToken}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      accessToken: expect.any(String) as string,
      user: { username },
    });
  });

  it('should_return_401_when_refreshing_with_a_tampered_token', async () => {
    // Arrange: a real token with the first character of its signature
    // changed (the last one may only hold padding bits).
    const registered = await post('register', {
      username: uniqueName(),
      password: PASSWORD,
    }).expect(201);
    const { accessToken } = registered.body as { accessToken: string };
    const [header, payload, signature] = accessToken.split('.');
    const first = signature?.charAt(0) === 'A' ? 'B' : 'A';
    const tampered = `${header}.${payload}.${first}${signature?.slice(1)}`;

    // Act
    const response = await request(server())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${tampered}`);

    // Assert
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      message: 'invalid or expired token',
    });
  });

  it('should_return_429_on_the_sixth_registration_from_one_ip_in_a_minute', async () => {
    // Arrange: invalid bodies still count, since the limit runs before the
    // validation, and they create no users.
    const invalid = { username: 'ab', password: 'short' };
    for (let attempt = 1; attempt <= 5; attempt++) {
      await post('register', invalid).expect(400);
    }

    // Act
    const response = await post('register', invalid);

    // Assert
    expect(response.status).toBe(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('should_return_401_when_refreshing_without_a_token', async () => {
    // Act
    const response = await request(server()).post('/api/v1/auth/refresh');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      message: 'invalid or expired token',
    });
  });
});
