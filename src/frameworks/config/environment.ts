/** Configuration of the API, read once at start-up and already validated. */
export interface Environment {
  readonly databaseUrl: string;
  readonly port: number;
}

const DEFAULT_PORT = 3000;
const MAX_PORT = 65535;
const POSTGRES_PROTOCOLS = ['postgresql:', 'postgres:'];

/**
 * Turns the raw environment variables into a typed `Environment`.
 * Throws one error listing every problem, so the API never starts with a
 * missing or malformed variable.
 */
export function validateEnvironment(
  variables: Record<string, unknown>,
): Environment {
  const problems: string[] = [];

  const databaseUrl = readDatabaseUrl(variables.DATABASE_URL, problems);
  const port = readPort(variables.PORT, problems);

  if (problems.length > 0) {
    throw new Error(`Invalid environment: ${problems.join('; ')}`);
  }
  return { databaseUrl, port };
}

function readDatabaseUrl(value: unknown, problems: string[]): string {
  if (typeof value !== 'string' || value.trim() === '') {
    problems.push('DATABASE_URL is required');
    return '';
  }
  if (!isPostgresUrl(value)) {
    problems.push('DATABASE_URL must be a postgresql:// URL');
  }
  return value;
}

function isPostgresUrl(value: string): boolean {
  if (!URL.canParse(value)) {
    return false;
  }
  return POSTGRES_PROTOCOLS.includes(new URL(value).protocol);
}

function readPort(value: unknown, problems: string[]): number {
  if (value === undefined || value === '') {
    return DEFAULT_PORT;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    problems.push(`PORT must be an integer between 1 and ${MAX_PORT}`);
  }
  return port;
}
