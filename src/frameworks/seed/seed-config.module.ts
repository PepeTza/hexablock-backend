import { Module } from '@nestjs/common';

import { SeedConfigController } from '../../adapters/http/seed/seed-config.controller';
import { PrismaSeedConfigStore } from '../../adapters/persistence/prisma-seed-config-store';
import type { ISeedConfigStore } from '../../application/ports/seed-config-store';
import { GetSeedConfigUseCase } from '../../application/use-cases/get-seed-config.use-case';
import { PrismaService } from '../prisma/prisma.service';
import { SEED_CONFIG_STORE } from './seed.tokens';

/** Wires the seed config endpoints: each port gets its Prisma adapter. */
@Module({
  controllers: [SeedConfigController],
  providers: [
    {
      provide: SEED_CONFIG_STORE,
      useFactory: (prisma: PrismaService): ISeedConfigStore =>
        new PrismaSeedConfigStore(prisma),
      inject: [PrismaService],
    },
    {
      provide: GetSeedConfigUseCase,
      useFactory: (store: ISeedConfigStore) => new GetSeedConfigUseCase(store),
      inject: [SEED_CONFIG_STORE],
    },
  ],
})
export class SeedConfigModule {}
