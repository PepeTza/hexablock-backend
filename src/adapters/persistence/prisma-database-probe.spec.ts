import { PrismaDatabaseProbe, RawQueryClient } from './prisma-database-probe';

/** Fake Prisma client whose only query behaves as the test decides. */
function fakeClient(query: () => Promise<unknown>): RawQueryClient {
  return { $queryRaw: query } as unknown as RawQueryClient;
}

describe('PrismaDatabaseProbe', () => {
  it('should_return_true_when_query_succeeds', async () => {
    // Arrange
    const probe = new PrismaDatabaseProbe(
      fakeClient(() => Promise.resolve([{ ok: 1 }])),
    );

    // Act
    const reachable = await probe.isReachable();

    // Assert
    expect(reachable).toBe(true);
  });

  it('should_return_false_when_query_fails', async () => {
    // Arrange
    const probe = new PrismaDatabaseProbe(
      fakeClient(() => Promise.reject(new Error('connection refused'))),
    );

    // Act
    const reachable = await probe.isReachable();

    // Assert
    expect(reachable).toBe(false);
  });

  it('should_return_false_when_query_takes_longer_than_the_timeout', async () => {
    // Arrange
    const neverAnswers = () => new Promise<unknown>(() => undefined);
    const probe = new PrismaDatabaseProbe(fakeClient(neverAnswers), 10);

    // Act
    const reachable = await probe.isReachable();

    // Assert
    expect(reachable).toBe(false);
  });
});
