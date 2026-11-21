import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

/** Response header that carries the id of each request (decision 22). */
export const REQUEST_ID_HEADER = 'X-Request-Id';

/** An Express request after `requestIdMiddleware` has run. */
export interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Gives every request a fresh id, sent back in `X-Request-Id` and written in
 * the logs. It is always generated here, never taken from the client, so
 * nobody can inject values into the log.
 */
export function requestIdMiddleware(
  request: RequestWithId,
  response: Response,
  next: NextFunction,
): void {
  const requestId = randomUUID();
  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

/** The id `requestIdMiddleware` gave to `request`. */
export function requestIdOf(request: RequestWithId): string {
  return request.requestId ?? 'unknown';
}
