import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { Environment } from '../config/environment';

/**
 * The single Prisma client of the API, shared through dependency injection.
 * It connects on the first query, not at start-up, so the API can start and
 * report `503` on `/health` while the database is unreachable.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Environment, true>) {
    const connectionString = config.get('databaseUrl', { infer: true });
    // Prisma 7 talks to PostgreSQL through the `pg` driver adapter.
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
