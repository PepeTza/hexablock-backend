import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/frameworks/app.module';
import { configureApp } from '../src/frameworks/configure-app';

export interface TestAppOptions {
  /** Providers to replace, by token. */
  readonly overrides?: ReadonlyArray<{ token: unknown; value: unknown }>;
  /** Test-only controllers added next to the real API. */
  readonly controllers?: Type[];
}

/** Builds the whole API exactly as `main.ts` does, for the e2e tests. */
export async function createTestApp(
  options: TestAppOptions = {},
): Promise<NestExpressApplication> {
  const builder = Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  });
  for (const { token, value } of options.overrides ?? []) {
    builder.overrideProvider(token).useValue(value);
  }
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}
