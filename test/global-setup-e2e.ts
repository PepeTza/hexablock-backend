import { execSync } from 'node:child_process';

import { testDatabaseUrl } from './test-database-url';

/**
 * Runs once before the e2e tests: applies the committed migrations to the
 * test database, so `npm run test:e2e` works without migrating by hand.
 * `migrate deploy` only applies pending migrations, so running it again (as
 * CI also does) changes nothing.
 */
export default function globalSetup(): void {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'inherit',
  });
}
