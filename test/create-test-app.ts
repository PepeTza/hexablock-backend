import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/frameworks/app.module';
import type { NodeEnv } from '../src/frameworks/config/environment';
import { configureApp } from '../src/frameworks/configure-app';

export interface TestAppOptions {
  /** Providers to replace, by token. */
  readonly overrides?: ReadonlyArray<{ token: unknown; value: unknown }>;
  /** Test-only controllers added next to the real API. */
  readonly controllers?: Type[];
  /** Environment the API believes it runs in; defaults to `test`. */
  readonly nodeEnv?: NodeEnv;
  /** Proxies the API trusts, as `TRUST_PROXY_HOPS`; defaults to none. */
  readonly trustProxyHops?: number;
  /** Origins allowed through CORS, as `CORS_ORIGINS`; defaults to none. */
  readonly corsOrigins?: readonly string[];
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
  configureApp(app, {
    nodeEnv: options.nodeEnv ?? 'test',
    trustProxyHops: options.trustProxyHops ?? 0,
    corsOrigins: options.corsOrigins ?? [],
  });
  await app.init();
  return app;
}
