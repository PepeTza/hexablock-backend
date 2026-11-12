import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './frameworks/app.module';
import { Environment } from './frameworks/config/environment';

// Every route of the contract is relative to this prefix (api-contracts §1).
const BASE_PATH = 'api/v1';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(BASE_PATH);

  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  await app.listen(config.get('port', { infer: true }));
}

void bootstrap();
