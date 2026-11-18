import { testDatabaseUrl } from './test-database-url';

// Runs in every test file: the API under test talks to the test database.
process.env.DATABASE_URL = testDatabaseUrl;
