import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './frameworks/app.module';
import { Environment } from './frameworks/config/environment';
import { configureApp } from './frameworks/configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  configureApp(
    app,
    config.get('nodeEnv', { infer: true }),
    config.get('trustProxyHops', { infer: true }),
  );
  // Render sends SIGTERM before it stops or replaces an instance. With the
  // hooks on, Nest runs `app.close()`, so `PrismaService.onModuleDestroy()`
  // closes the pool cleanly. Only here, not in `configureApp`, so the e2e
  // apps do not add signal listeners to Jest's process. Source: NestJS docs,
  // "Lifecycle events", https://docs.nestjs.com/fundamentals/lifecycle-events
  app.enableShutdownHooks();

  await app.listen(config.get('port', { infer: true }));
}

void bootstrap();
