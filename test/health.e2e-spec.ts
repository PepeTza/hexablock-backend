import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { IDatabaseProbe } from '../src/application/ports/database-probe';
import { DATABASE_PROBE } from '../src/frameworks/health/health.tokens';
import { createTestApp } from './create-test-app';

describe('GET /api/v1/health (e2e)', () => {
  let app: NestExpressApplication;

  afterEach(async () => {
    await app.close();
  });

  it('should_return_200_with_database_ok_when_database_is_up', async () => {
    // Arrange
    app = await createTestApp();

    // Act
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'ok' });
  });

  it('should_return_503_with_database_down_when_database_is_unreachable', async () => {
    // Arrange
    const unreachable: IDatabaseProbe = {
      isReachable: () => Promise.resolve(false),
    };
    app = await createTestApp({
      overrides: [{ token: DATABASE_PROBE, value: unreachable }],
    });

    // Act
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    // Assert
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error', database: 'down' });
  });
});
