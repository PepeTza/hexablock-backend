import { Module } from '@nestjs/common';

import { LevelsController } from '../../adapters/http/levels/levels.controller';
import { PrismaLevelCatalog } from '../../adapters/persistence/prisma-level-catalog';
import type { ILevelCatalog } from '../../application/ports/level-catalog';
import { ListLevelsUseCase } from '../../application/use-cases/list-levels.use-case';
import { PublishLevelUseCase } from '../../application/use-cases/publish-level.use-case';
import { LevelSpecValidators } from '../../domain/level/level-spec-validator';
import { SortSpecV1Validator } from '../../domain/level/sort-spec-v1-validator';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { LEVEL_CATALOG } from './levels.tokens';

/**
 * Wires the level endpoints. The spec validators the server knows are
 * listed here, once; Hexa Fit's joins when its spec is approved (#60).
 */
@Module({
  imports: [AuthModule],
  controllers: [LevelsController],
  providers: [
    {
      provide: LEVEL_CATALOG,
      useFactory: (prisma: PrismaService): ILevelCatalog =>
        new PrismaLevelCatalog(prisma),
      inject: [PrismaService],
    },
    {
      provide: LevelSpecValidators,
      useFactory: () => new LevelSpecValidators([new SortSpecV1Validator()]),
    },
    {
      provide: ListLevelsUseCase,
      useFactory: (catalog: ILevelCatalog) => new ListLevelsUseCase(catalog),
      inject: [LEVEL_CATALOG],
    },
    {
      provide: PublishLevelUseCase,
      useFactory: (catalog: ILevelCatalog, validators: LevelSpecValidators) =>
        new PublishLevelUseCase(catalog, validators),
      inject: [LEVEL_CATALOG, LevelSpecValidators],
    },
  ],
})
export class LevelsModule {}
