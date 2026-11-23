import { Module } from '@nestjs/common';

import { ProgressController } from '../../adapters/http/progress/progress.controller';
import { PrismaLevelRepository } from '../../adapters/persistence/prisma-level-repository';
import { PrismaProgressRepository } from '../../adapters/persistence/prisma-progress-repository';
import type { ILevelRepository } from '../../application/ports/level-repository';
import type { IProgressRepository } from '../../application/ports/progress-repository';
import { GetProgressUseCase } from '../../application/use-cases/get-progress.use-case';
import { SyncProgressUseCase } from '../../application/use-cases/sync-progress.use-case';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { LEVEL_REPOSITORY, PROGRESS_REPOSITORY } from './progress.tokens';

/**
 * Wires the progress endpoints: each port gets its Prisma adapter and the
 * use cases are built with `useFactory`. Imports `AuthModule` for the JWT
 * guard.
 */
@Module({
  imports: [AuthModule],
  controllers: [ProgressController],
  providers: [
    {
      provide: PROGRESS_REPOSITORY,
      useFactory: (prisma: PrismaService): IProgressRepository =>
        new PrismaProgressRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: LEVEL_REPOSITORY,
      useFactory: (prisma: PrismaService): ILevelRepository =>
        new PrismaLevelRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: GetProgressUseCase,
      useFactory: (progress: IProgressRepository) =>
        new GetProgressUseCase(progress),
      inject: [PROGRESS_REPOSITORY],
    },
    {
      provide: SyncProgressUseCase,
      useFactory: (progress: IProgressRepository, levels: ILevelRepository) =>
        new SyncProgressUseCase(progress, levels),
      inject: [PROGRESS_REPOSITORY, LEVEL_REPOSITORY],
    },
  ],
})
export class ProgressModule {}
