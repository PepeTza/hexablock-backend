import * as bcrypt from 'bcrypt';

import { BcryptPasswordHasher } from './bcrypt-password-hasher';

// The real bcrypt, with `hash` wrapped so one test can make it fail once.
jest.mock('bcrypt', () => {
  const actual = jest.requireActual<typeof bcrypt>('bcrypt');
  return {
    ...actual,
    hash: jest.fn((data: string, rounds: number) => actual.hash(data, rounds)),
  };
});

// `hash` is overloaded; the test only uses its promise form.
const mockedHash = bcrypt.hash as unknown as jest.Mock<
  Promise<string>,
  [string, number]
>;

// The lowest cost bcrypt accepts, so the tests stay fast.
const TEST_COST = 4;

describe('BcryptPasswordHasher', () => {
  it('should_match_only_the_original_password_when_hashed', async () => {
    // Arrange
    const hasher = new BcryptPasswordHasher(TEST_COST);

    // Act
    const hash = await hasher.hash('s3cretPass');

    // Assert
    expect(hash).not.toContain('s3cretPass');
    await expect(hasher.matches('s3cretPass', hash)).resolves.toBe(true);
    await expect(hasher.matches('s3cretPasS', hash)).resolves.toBe(false);
  });

  it('should_retry_the_dummy_hash_when_computing_it_failed_once', async () => {
    // Arrange: the first dummy hash fails, as a transient native error would.
    const hasher = new BcryptPasswordHasher(TEST_COST);
    const failure = new Error('transient failure');
    mockedHash.mockRejectedValueOnce(failure);

    // Act
    const first = hasher.matches('s3cretPass', null);
    await expect(first).rejects.toBe(failure);
    const second = await hasher.matches('s3cretPass', null);

    // Assert
    expect(second).toBe(false);
  });

  it('should_return_false_when_there_is_no_hash_to_compare', async () => {
    // Arrange
    const hasher = new BcryptPasswordHasher(TEST_COST);

    // Act
    const matches = await hasher.matches('s3cretPass', null);

    // Assert
    expect(matches).toBe(false);
  });
});
