/**
 * Rate limit of `POST /scores`: 30 submissions per minute per player
 * (api-contracts §1, rate limits; RN-39).
 */
export const SCORE_RATE_LIMIT = { limit: 30, ttl: 60_000 } as const;
