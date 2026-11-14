import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './frameworks/app.module';
import { Environment } from './frameworks/config/environment';
import { configureApp } from './frameworks/configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  await app.listen(config.get('port', { infer: true }));
}

void bootstrap();
