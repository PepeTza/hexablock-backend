/** Where the API runs; `production` turns off what only helps developers. */
export const NODE_ENVS = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

/** Configuration of the API, read once at start-up and already validated. */
export interface Environment {
  readonly databaseUrl: string;
  readonly port: number;
  readonly nodeEnv: NodeEnv;
  /** Signs and verifies the JWTs (RNF-10); never committed. */
  readonly jwtSecret: string;
  /**
   * Proxies in front of the API whose X-Forwarded-For entries are trusted.
   * `0` (the default) trusts none; Render sets `1` (D-10).
   */
  readonly trustProxyHops: number;
}

const DEFAULT_PORT = 3000;
const MAX_PORT = 65535;
const POSTGRES_PROTOCOLS = ['postgresql:', 'postgres:'];
// 32 characters give HS256 a key of at least 256 bits. Source: IETF, RFC 7518
// "JSON Web Algorithms", §3.2: https://www.rfc-editor.org/rfc/rfc7518#section-3.2
const MIN_JWT_SECRET_LENGTH = 32;
// Render needs 1 hop (D-10). The cap is not a platform limit: it rejects a
// typo that would trust hops a client can fake.
const MAX_TRUST_PROXY_HOPS = 5;

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
  const nodeEnv = readNodeEnv(variables.NODE_ENV, problems);
  const jwtSecret = readJwtSecret(variables.JWT_SECRET, problems);
  const trustProxyHops = readTrustProxyHops(
    variables.TRUST_PROXY_HOPS,
    problems,
  );

  if (problems.length > 0) {
    throw new Error(`Invalid environment: ${problems.join('; ')}`);
  }
  return { databaseUrl, port, nodeEnv, jwtSecret, trustProxyHops };
}

function readTrustProxyHops(value: unknown, problems: string[]): number {
  if (value === undefined || value === '') {
    return 0;
  }
  // Only plain digits: Number() alone would accept ' ', '1.0' or '0x1'.
  const hops =
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (Number.isNaN(hops) || hops > MAX_TRUST_PROXY_HOPS) {
    problems.push(
      `TRUST_PROXY_HOPS must be an integer between 0 and ${MAX_TRUST_PROXY_HOPS}`,
    );
  }
  return hops;
}

function readJwtSecret(value: unknown, problems: string[]): string {
  if (typeof value !== 'string' || value === '') {
    problems.push('JWT_SECRET is required');
    return '';
  }
  if (value.length < MIN_JWT_SECRET_LENGTH) {
    problems.push(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`,
    );
  }
  return value;
}

function readNodeEnv(value: unknown, problems: string[]): NodeEnv {
  if (value === undefined || value === '') {
    return 'development';
  }
  const nodeEnv = NODE_ENVS.find((candidate) => candidate === value);
  if (!nodeEnv) {
    problems.push(`NODE_ENV must be one of ${NODE_ENVS.join(', ')}`);
    return 'development';
  }
  return nodeEnv;
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
