import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/** Makes the one `PrismaService` available to every module. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
