import { Module } from '@nestjs/common';

import { HealthController } from '../../adapters/http/health/health.controller';
import { PrismaDatabaseProbe } from '../../adapters/persistence/prisma-database-probe';
import { IDatabaseProbe } from '../../application/ports/database-probe';
import { CheckHealthUseCase } from '../../application/use-cases/check-health.use-case';
import { PrismaService } from '../prisma/prisma.service';
import { DATABASE_PROBE } from './health.tokens';

/**
 * Wires the health endpoint. The use case is a plain class, so it is built
 * here with `useFactory` instead of carrying Nest decorators.
 */
@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: DATABASE_PROBE,
      useFactory: (prisma: PrismaService): IDatabaseProbe =>
        new PrismaDatabaseProbe(prisma),
      inject: [PrismaService],
    },
    {
      provide: CheckHealthUseCase,
      useFactory: (probe: IDatabaseProbe) => new CheckHealthUseCase(probe),
      inject: [DATABASE_PROBE],
    },
  ],
})
export class HealthModule {}
