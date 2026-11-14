import { INestApplication } from '@nestjs/common';

// Every route of the contract is relative to this prefix (api-contracts §1).
export const BASE_PATH = 'api/v1';

/** Settings shared by the real server (`main.ts`) and the e2e tests. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(BASE_PATH);
}
