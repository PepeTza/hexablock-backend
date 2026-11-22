import { testDatabaseUrl } from './test-database-url';

// Runs in every test file: the API under test talks to the test database.
process.env.DATABASE_URL = testDatabaseUrl;
// Only for tests; real secrets come from the environment, never the repo.
process.env.JWT_SECRET = 'e2e-only-secret-with-at-least-32-chars';
