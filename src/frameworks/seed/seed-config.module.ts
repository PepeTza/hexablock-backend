import { Module } from '@nestjs/common';

import { SeedConfigController } from '../../adapters/http/seed/seed-config.controller';
import { PrismaLevelRepository } from '../../adapters/persistence/prisma-level-repository';
import { PrismaSeedConfigStore } from '../../adapters/persistence/prisma-seed-config-store';
import type { ILevelRepository } from '../../application/ports/level-repository';
import type { ISeedConfigStore } from '../../application/ports/seed-config-store';
import { ConfigureSeedUseCase } from '../../application/use-cases/configure-seed.use-case';
import { GetSeedConfigUseCase } from '../../application/use-cases/get-seed-config.use-case';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { SEED_CONFIG_STORE, SEED_LEVEL_REPOSITORY } from './seed.tokens';

/** Wires the seed config endpoints: each port gets its Prisma adapter. */
@Module({
  // The guards of PUT need the token service.
  imports: [AuthModule],
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
    {
      provide: SEED_LEVEL_REPOSITORY,
      useFactory: (prisma: PrismaService): ILevelRepository =>
        new PrismaLevelRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: ConfigureSeedUseCase,
      useFactory: (store: ISeedConfigStore, levels: ILevelRepository) =>
        new ConfigureSeedUseCase(store, levels),
      inject: [SEED_CONFIG_STORE, SEED_LEVEL_REPOSITORY],
    },
  ],
})
export class SeedConfigModule {}
