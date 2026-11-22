import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Aspect (guard): rate limit of `POST /auth/login`, counted per username and
 * IP (api-contracts §1, rate limits): one IP can try only 5 passwords a
 * minute for one account, while players sharing an IP (the same Wi-Fi) do
 * not block each other.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = typeof req.ip === 'string' ? req.ip : 'unknown-ip';
    const body = req.body as { username?: unknown } | undefined;
    // Lower-cased like `Username`, so "Ronald" and "ronald" share a counter.
    const username =
      typeof body?.username === 'string' ? body.username.toLowerCase() : '';
    return Promise.resolve(`${ip}:${username}`);
  }
}
