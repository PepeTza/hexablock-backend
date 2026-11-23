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
 * `nodeEnv` and `trustProxyHops` come from the validated environment.
 */
export function configureApp(
  app: NestExpressApplication,
  nodeEnv: NodeEnv,
  trustProxyHops: number,
): void {
  // Do not announce the server technology (decision 22).
  app.disable('x-powered-by');
  // Behind N proxies, each appends the caller's IP to X-Forwarded-For.
  // Trusting exactly N hops makes `req.ip` the real client, so rate limits
  // count each player apart; trusting more (or `true`) would let a client
  // fake its IP with its own header. With no proxy (`0`), the header is
  // ignored. Render runs one proxy (D-10). Source: Express docs, "Express
  // behind proxies": https://expressjs.com/en/guide/behind-proxies.html
  app.set('trust proxy', trustProxyHops);
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
