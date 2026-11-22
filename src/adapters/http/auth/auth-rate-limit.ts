/**
 * Rate limit of `POST /auth/register` and `POST /auth/login`: 5 requests per
 * minute (api-contracts §1, rate limits; decision 21). The single source of
 * this value, used by the controller and by the throttler module.
 */
export const AUTH_RATE_LIMIT = { limit: 5, ttl: 60_000 } as const;
