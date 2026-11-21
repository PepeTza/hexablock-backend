import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { createTestApp } from './create-test-app';

describe('Swagger (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    app = await createTestApp();
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
