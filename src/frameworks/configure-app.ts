import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { toValidationException } from '../adapters/http/validation/validation-exception';
import type { NodeEnv } from './config/environment';
import { AllExceptionsFilter } from './http/all-exceptions.filter';
import { requestIdMiddleware } from './http/request-id';
import { RequestLoggingInterceptor } from './http/request-logging.interceptor';

// Every route of the contract is relative to this prefix (api-contracts §1).
export const BASE_PATH = 'api/v1';

// Swagger UI and its OpenAPI document (`api/docs-json`).
export const DOCS_PATH = 'api/docs';

/**
 * Settings shared by the real server (`main.ts`) and the e2e tests.
 * `nodeEnv` comes from the validated environment.
 */
export function configureApp(
  app: NestExpressApplication,
  nodeEnv: NodeEnv,
): void {
  // Do not announce the server technology (decision 22).
  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  // Aspect: every body is checked against its DTO before reaching a handler.
  // Unknown fields are rejected, not silently dropped (mass assignment).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: toValidationException,
    }),
  );
  app.setGlobalPrefix(BASE_PATH);

  // The docs map every route: useful to develop, not to show in production
  // (decision 22).
  if (nodeEnv !== 'production') {
    setUpDocs(app);
  }
}

function setUpDocs(app: NestExpressApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('HexaBlock Suite API')
      .setDescription('REST API of HexaBlock Suite (docs/api-contracts.md).')
      .setVersion('v1')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup(DOCS_PATH, app, document);
}
