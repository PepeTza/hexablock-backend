import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Every route of the contract is relative to this prefix (api-contracts §1).
export const BASE_PATH = 'api/v1';

// Swagger UI; the decorators for each endpoint and DTO come with T17.
export const DOCS_PATH = 'api/docs';

/** Settings shared by the real server (`main.ts`) and the e2e tests. */
export function configureApp(app: INestApplication): void {
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
