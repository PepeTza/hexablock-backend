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

  it('should_not_match_when_the_password_has_more_than_72_bytes_even_if_its_first_72_match', async () => {
    // Arrange: bcrypt alone would ignore everything after byte 72.
    const hasher = new BcryptPasswordHasher(TEST_COST);
    const password = 'a'.repeat(72);
    const hash = await hasher.hash(password);

    // Act
    const matches = await hasher.matches(`${password}extra`, hash);

    // Assert
    expect(matches).toBe(false);
    await expect(hasher.matches(password, hash)).resolves.toBe(true);
  });

  it('should_match_when_a_multibyte_password_has_exactly_72_bytes', async () => {
    // Arrange: 70 ASCII bytes plus 'ñ', which takes 2 bytes in UTF-8.
    const hasher = new BcryptPasswordHasher(TEST_COST);
    const password = `${'a'.repeat(70)}ñ`;
    const hash = await hasher.hash(password);

    // Act
    const matches = await hasher.matches(password, hash);

    // Assert
    expect(matches).toBe(true);
  });

  it('should_not_match_when_a_multibyte_password_has_72_characters_but_74_bytes', async () => {
    // Arrange: the stored password is 72 bytes; the attempt adds one more
    // 'ñ', so it has 72 characters, 74 bytes, and the same first 72 bytes.
    // bcrypt alone would accept it.
    const hasher = new BcryptPasswordHasher(TEST_COST);
    const stored = `${'a'.repeat(70)}ñ`;
    const hash = await hasher.hash(stored);
    const password = `${stored}ñ`;

    // Act
    const matches = await hasher.matches(password, hash);

    // Assert
    expect(matches).toBe(false);
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
