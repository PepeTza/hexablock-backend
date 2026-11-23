import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';

/**
 * Aspect (guard): rate limit of `POST /scores`, counted per player
 * (api-contracts §1, rate limits), so players sharing an IP do not block
 * each other. Runs after `JwtAuthGuard`, which sets the claims it reads.
 */
@Injectable()
export class ScoreThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const { claims } = req as unknown as AuthenticatedRequest;
    return Promise.resolve(`user:${claims?.userId ?? 'anonymous'}`);
  }
}
