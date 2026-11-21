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

  it('should_document_the_health_responses_in_openapi', async () => {
    // Act
    const response = await request(app.getHttpServer()).get('/api/docs-json');

    // Assert
    const document = response.body as OpenApiDocument;
    const responses = document.paths['/api/v1/health']?.get?.responses ?? {};
    expect(Object.keys(responses).sort()).toEqual(['200', '500', '503']);
    expect(document.components.schemas.HealthResponse?.properties).toEqual({
      status: expect.objectContaining({ enum: ['ok', 'error'] }) as unknown,
      database: expect.objectContaining({ enum: ['ok', 'down'] }) as unknown,
    });
    expect(
      document.components.schemas.ErrorResponseDto?.required?.sort(),
    ).toEqual(['error', 'message', 'requestId', 'statusCode']);
  });
});

describe('Swagger in production (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    app = await createTestApp({ nodeEnv: 'production' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('should_not_serve_swagger_when_node_env_is_production', async () => {
    // Act
    const ui = await request(app.getHttpServer()).get('/api/docs');
    const json = await request(app.getHttpServer()).get('/api/docs-json');

    // Assert
    expect(ui.status).toBe(404);
    expect(json.status).toBe(404);
  });
});

/** The parts of the OpenAPI document these tests read. */
interface OpenApiDocument {
  paths: Record<
    string,
    { get?: { responses?: Record<string, unknown> } } | undefined
  >;
  components: {
    schemas: Record<
      string,
      { properties?: Record<string, unknown>; required?: string[] } | undefined
    >;
  };
}
