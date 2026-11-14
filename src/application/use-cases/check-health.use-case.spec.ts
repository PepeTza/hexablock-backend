import { IDatabaseProbe } from '../ports/database-probe';
import { CheckHealthUseCase } from './check-health.use-case';

/** Fake of the port: answers what the test tells it to. */
class FakeDatabaseProbe implements IDatabaseProbe {
  constructor(private readonly reachable: boolean) {}

  isReachable(): Promise<boolean> {
    return Promise.resolve(this.reachable);
  }
}

describe('CheckHealthUseCase', () => {
  it('should_report_database_ok_when_probe_is_reachable', async () => {
    // Arrange
    const useCase = new CheckHealthUseCase(new FakeDatabaseProbe(true));

    // Act
    const report = await useCase.execute();

    // Assert
    expect(report).toEqual({ database: 'ok' });
  });

  it('should_report_database_down_when_probe_is_unreachable', async () => {
    // Arrange
    const useCase = new CheckHealthUseCase(new FakeDatabaseProbe(false));

    // Act
    const report = await useCase.execute();

    // Assert
    expect(report).toEqual({ database: 'down' });
  });
});
