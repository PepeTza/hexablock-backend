import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './frameworks/app.module';
import { Environment } from './frameworks/config/environment';
import { configureApp } from './frameworks/configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  configureApp(app, config.get('nodeEnv', { infer: true }));

  await app.listen(config.get('port', { infer: true }));
}

void bootstrap();
