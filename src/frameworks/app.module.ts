import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from './config/environment';

/** Root module: every feature module of the API is imported here. */
@Module({
  imports: [
    // Reads `.env` and the process variables once; the API does not start
    // if `validateEnvironment` rejects them.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
  ],
})
export class AppModule {}
