import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/frameworks/app.module';
import { configureApp } from '../src/frameworks/configure-app';

describe('Swagger (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should_serve_swagger_ui_when_requesting_api_docs', async () => {
    // Act
    const response = await request(app.getHttpServer()).get('/api/docs');

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger-ui');
  });

  it('should_list_the_health_route_when_requesting_the_openapi_document', async () => {
    // Act
    const response = await request(app.getHttpServer()).get('/api/docs-json');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(['paths', '/api/v1/health']);
  });
});
