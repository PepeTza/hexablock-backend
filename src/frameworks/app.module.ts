import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AUTH_RATE_LIMIT } from '../adapters/http/auth/auth-rate-limit';
import { AuthModule } from './auth/auth.module';
import { validateEnvironment } from './config/environment';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgressModule } from './progress/progress.module';
import { ScoresModule } from './scores/scores.module';

/** Root module: every feature module of the API is imported here. */
@Module({
  imports: [
    // Reads `.env` and the process variables once; the API does not start
    // if `validateEnvironment` rejects them.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    // Rate-limit counters, used only by routes that apply a throttler guard.
    // The default is the auth limit; routes state theirs with `@Throttle`.
    // In memory: fine for one instance.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ...AUTH_RATE_LIMIT }],
      errorMessage: 'too many requests',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ProgressModule,
    ScoresModule,
  ],
})
export class AppModule {}
