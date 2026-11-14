import { PrismaClient } from '@prisma/client';

import { IDatabaseProbe } from '../../application/ports/database-probe';

/** The only part of Prisma the probe needs; lets tests pass a small fake. */
export type RawQueryClient = Pick<PrismaClient, '$queryRaw'>;

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Adapter: implements `IDatabaseProbe` with a `SELECT 1` through Prisma.
 * Never throws: a failed or slow query means "not reachable".
 */
export class PrismaDatabaseProbe implements IDatabaseProbe {
  constructor(
    private readonly client: RawQueryClient,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  async isReachable(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Database probe timed out')),
        this.timeoutMs,
      );
    });

    try {
      await Promise.race([this.client.$queryRaw`SELECT 1`, timeout]);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
