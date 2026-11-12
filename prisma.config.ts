import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

// The Prisma CLI does not read `.env` by itself. Local development loads it
// here; CI and production already have the variables in the process.
if (existsSync('.env')) {
  process.loadEnvFile();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
