import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from './config/environment';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

/** Root module: every feature module of the API is imported here. */
@Module({
  imports: [
    // Reads `.env` and the process variables once; the API does not start
    // if `validateEnvironment` rejects them.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
