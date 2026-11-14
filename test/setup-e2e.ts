// e2e tests never use the developer's `.env` database, which could point to
// Supabase (data-model §7). They use the disposable PostgreSQL of
// `npm run db:up`, or the one CI provides through TEST_DATABASE_URL.
const LOCAL_TEST_DATABASE_URL =
  'postgresql://hexablock:hexablock@localhost:5433/hexablock?schema=public';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? LOCAL_TEST_DATABASE_URL;
