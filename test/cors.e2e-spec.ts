import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { createTestApp } from './create-test-app';

const PANEL_ORIGIN = 'http://localhost:5173';
const OTHER_ORIGIN = 'https://evil.example.com';
const HEALTH_PATH = '/api/v1/health';

describe('CORS (e2e)', () => {
  let app: NestExpressApplication;

  afterEach(async () => {
    await app.close();
  });

  it('should_allow_the_preflight_when_the_origin_is_configured', async () => {
    // Arrange
    app = await createTestApp({ corsOrigins: [PANEL_ORIGIN] });

    // Act
    const response = await request(app.getHttpServer())
      .options(HEALTH_PATH)
      .set('Origin', PANEL_ORIGIN)
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'Authorization, Content-Type');

    // Assert
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(PANEL_ORIGIN);
    expect(response.headers['access-control-allow-methods']).toBe(
      'GET,POST,PUT',
    );
    expect(response.headers['access-control-allow-headers']).toBe(
      'Authorization,Content-Type',
    );
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
  });

  it('should_allow_the_request_when_the_origin_is_configured', async () => {
    // Arrange
    app = await createTestApp({ corsOrigins: [PANEL_ORIGIN] });

    // Act
    const response = await request(app.getHttpServer())
      .get(HEALTH_PATH)
      .set('Origin', PANEL_ORIGIN);

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(PANEL_ORIGIN);
  });

  it('should_send_no_cors_header_when_the_origin_is_not_configured', async () => {
    // Arrange
    app = await createTestApp({ corsOrigins: [PANEL_ORIGIN] });

    // Act
    const response = await request(app.getHttpServer())
      .get(HEALTH_PATH)
      .set('Origin', OTHER_ORIGIN);

    // Assert
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should_send_no_allow_origin_on_preflight_when_the_origin_is_not_configured', async () => {
    // Arrange
    app = await createTestApp({ corsOrigins: [PANEL_ORIGIN] });

    // Act
    const response = await request(app.getHttpServer())
      .options(HEALTH_PATH)
      .set('Origin', OTHER_ORIGIN)
      .set('Access-Control-Request-Method', 'PUT');

    // Assert
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should_send_no_cors_header_when_no_origin_is_configured', async () => {
    // Arrange
    app = await createTestApp();

    // Act
    const response = await request(app.getHttpServer())
      .get(HEALTH_PATH)
      .set('Origin', PANEL_ORIGIN);

    // Assert
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
