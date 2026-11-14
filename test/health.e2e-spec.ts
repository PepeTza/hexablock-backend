import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { IDatabaseProbe } from '../src/application/ports/database-probe';
import { AppModule } from '../src/frameworks/app.module';
import { configureApp } from '../src/frameworks/configure-app';
import { DATABASE_PROBE } from '../src/frameworks/health/health.tokens';

/** Builds the whole API, optionally replacing the database probe. */
async function createApp(
  probe?: IDatabaseProbe,
): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (probe) {
    builder.overrideProvider(DATABASE_PROBE).useValue(probe);
  }
  const moduleRef = await builder.compile();

  const app: INestApplication<App> = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

describe('GET /api/v1/health (e2e)', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app.close();
  });

  it('should_return_200_with_database_ok_when_database_is_up', async () => {
    // Arrange
    app = await createApp();

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
    app = await createApp(unreachable);

    // Act
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    // Assert
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error', database: 'down' });
  });
});
