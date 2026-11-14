import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';

import { CheckHealthUseCase } from '../../../application/use-cases/check-health.use-case';
import { HealthResponse } from './health-response.dto';

/** Translates the health report to HTTP: `200` when up, `503` when down. */
@Controller('health')
export class HealthController {
  constructor(private readonly checkHealth: CheckHealthUseCase) {}

  @Get()
  async check(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthResponse> {
    const report = await this.checkHealth.execute();

    if (report.database === 'down') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'error', database: 'down' };
    }
    return { status: 'ok', database: 'ok' };
  }
}
