import { Controller, Get } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { createTestApp } from './create-test-app';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Test-only routes that fail on purpose; never part of the real API. */
@Controller('test-errors')
class ErrorFixtureController {
  @Get('unexpected')
  failUnexpectedly(): never {
    throw new Error('SELECT password_hash FROM users WHERE id = 1 failed');
  }
}

describe('Error responses (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    app = await createTestApp({ controllers: [ErrorFixtureController] });
  });

  afterEach(async () => {
    await app.close();
  });

  it('should_return_generic_500_with_request_id_when_an_unexpected_error_happens', async () => {
    // Act
    const response = await request(app.getHttpServer()).get(
      '/api/v1/test-errors/unexpected',
    );

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Unexpected error',
      requestId: response.headers['x-request-id'],
    });
    expect(response.text).not.toMatch(/password_hash|SELECT|at \w+ \(/);
  });

  it('should_return_404_in_the_contract_format_when_the_route_does_not_exist', async () => {
    // Act
    const response = await request(app.getHttpServer()).get(
      '/api/v1/no-such-route',
    );

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      requestId: response.headers['x-request-id'],
    });
  });

  it('should_send_x_request_id_and_hide_x_powered_by', async () => {
    // Act
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    // Assert
    expect(response.headers['x-request-id']).toMatch(UUID);
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
