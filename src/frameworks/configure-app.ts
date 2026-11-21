import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { toValidationException } from '../adapters/http/validation/validation-exception';
import { AllExceptionsFilter } from './http/all-exceptions.filter';
import { requestIdMiddleware } from './http/request-id';

// Every route of the contract is relative to this prefix (api-contracts §1).
export const BASE_PATH = 'api/v1';

// Swagger UI; the decorators for each endpoint and DTO come with T17.
export const DOCS_PATH = 'api/docs';

/** Settings shared by the real server (`main.ts`) and the e2e tests. */
export function configureApp(app: NestExpressApplication): void {
  // Do not announce the server technology (decision 22).
  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
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
