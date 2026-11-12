import { NestFactory } from '@nestjs/core';

import { AppModule } from './frameworks/app.module';

// Every route of the contract is relative to this prefix (api-contracts §1).
const BASE_PATH = 'api/v1';
const DEFAULT_PORT = 3000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(BASE_PATH);
  await app.listen(process.env.PORT ?? DEFAULT_PORT);
}

void bootstrap();
