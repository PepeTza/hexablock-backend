import { BcryptPasswordHasher } from './bcrypt-password-hasher';

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

  it('should_return_false_when_there_is_no_hash_to_compare', async () => {
    // Arrange
    const hasher = new BcryptPasswordHasher(TEST_COST);

    // Act
    const matches = await hasher.matches('s3cretPass', null);

    // Assert
    expect(matches).toBe(false);
  });
});
