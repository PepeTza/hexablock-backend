/** Body of `GET /health` (api-contracts §8). */
export interface HealthResponse {
  readonly status: 'ok' | 'error';
  readonly database: 'ok' | 'down';
}
