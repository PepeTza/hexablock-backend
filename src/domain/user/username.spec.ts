import { InvalidUsernameError, Username } from './username';

describe('Username', () => {
  it('should_lowercase_the_name_when_created_with_capitals', () => {
    // Arrange
    const raw = 'Ronald_G';

    // Act
    const username = Username.create(raw);

    // Assert
    expect(username.value).toBe('ronald_g');
    expect(username.equals(Username.create('ronald_g'))).toBe(true);
  });

  it.each(['ab', 'a'.repeat(21)])(
    'should_reject_the_name_when_shorter_than_3_or_longer_than_20 (%s)',
    (raw) => {
      // Arrange
      const create = (): Username => Username.create(raw);

      // Act and Assert
      expect(create).toThrow(InvalidUsernameError);
    },
  );

  // The Kelvin sign (U+212A) becomes the ASCII 'k' when lower-cased, so the
  // rule must be checked before lower-casing, not after.
  it.each(['ronald g', 'ronald-g', 'peña', 'ronald!', '\u212Aenneth'])(
    'should_reject_the_name_when_it_has_characters_other_than_letters_digits_or_underscore (%s)',
    (raw) => {
      // Arrange
      const create = (): Username => Username.create(raw);

      // Act and Assert
      expect(create).toThrow(InvalidUsernameError);
    },
  );
});
