import { Module } from '@nestjs/common';

import { ScoresController } from '../../adapters/http/scores/scores.controller';
import { PrismaLevelRepository } from '../../adapters/persistence/prisma-level-repository';
import { PrismaScoreRepository } from '../../adapters/persistence/prisma-score-repository';
import type { ILevelRepository } from '../../application/ports/level-repository';
import type { IScoreRepository } from '../../application/ports/score-repository';
import { SubmitScoreUseCase } from '../../application/use-cases/submit-score.use-case';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { SCORE_LEVEL_REPOSITORY, SCORE_REPOSITORY } from './scores.tokens';

/**
 * Wires `POST /scores`: each port gets its Prisma adapter and the use case
 * is built with `useFactory`. Imports `AuthModule` for the JWT guard.
 */
@Module({
  imports: [AuthModule],
  controllers: [ScoresController],
  providers: [
    {
      provide: SCORE_REPOSITORY,
      useFactory: (prisma: PrismaService): IScoreRepository =>
        new PrismaScoreRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: SCORE_LEVEL_REPOSITORY,
      useFactory: (prisma: PrismaService): ILevelRepository =>
        new PrismaLevelRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: SubmitScoreUseCase,
      useFactory: (scores: IScoreRepository, levels: ILevelRepository) =>
        new SubmitScoreUseCase(scores, levels),
      inject: [SCORE_REPOSITORY, SCORE_LEVEL_REPOSITORY],
    },
  ],
})
export class ScoresModule {}
