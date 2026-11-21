import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IsInt, IsString, Length, Min } from 'class-validator';
import request from 'supertest';

import { createTestApp } from './create-test-app';

/** Test-only body, shaped like a real DTO; never part of the real API. */
class FixtureBody {
  @IsString()
  @Length(3, 20)
  username!: string;

  @IsInt()
  @Min(0)
  score!: number;
}

/** Test-only route that echoes a valid body; never part of the real API. */
@Controller('test-validation')
class ValidationFixtureController {
  @Post()
  @HttpCode(200)
  echo(@Body() body: FixtureBody): FixtureBody {
    return body;
  }
}

describe('Request validation (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    app = await createTestApp({ controllers: [ValidationFixtureController] });
  });

  afterEach(async () => {
    await app.close();
  });

  function post(body: unknown): request.Test {
    return request(app.getHttpServer())
      .post('/api/v1/test-validation')
      .send(body as object);
  }

  it('should_return_400_with_details_when_the_body_is_invalid', async () => {
    // Act
    const response = await post({ username: 'ab', score: 5 });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: expect.stringContaining('username') as string,
      details: [{ field: 'username', issue: 'length' }],
      requestId: response.headers['x-request-id'],
    });
  });

  it('should_return_400_when_the_body_has_an_unknown_field', async () => {
    // Act
    const response = await post({
      username: 'kenneth',
      score: 5,
      role: 'admin',
    });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      details: [{ field: 'role', issue: 'notAllowed' }],
    });
  });

  it('should_return_400_when_the_json_is_malformed', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/api/v1/test-validation')
      .set('Content-Type', 'application/json')
      .send('{"username": ');

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      requestId: response.headers['x-request-id'],
    });
  });

  it('should_reach_the_handler_when_the_body_is_valid', async () => {
    // Act
    const response = await post({ username: 'kenneth', score: 5 });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ username: 'kenneth', score: 5 });
  });
});
