import { IDatabaseProbe } from '../ports/database-probe';

export interface HealthReport {
  readonly database: 'ok' | 'down';
}

/** Reports whether the parts the API depends on are available. */
export class CheckHealthUseCase {
  constructor(private readonly databaseProbe: IDatabaseProbe) {}

  async execute(): Promise<HealthReport> {
    const reachable = await this.databaseProbe.isReachable();
    return { database: reachable ? 'ok' : 'down' };
  }
}
