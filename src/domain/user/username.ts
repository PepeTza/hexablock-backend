// ASCII letters, digits and `_`, 3 to 20 characters (api-contracts §3,
// decision 21).
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

/** A name that breaks the username rule. */
export class InvalidUsernameError extends Error {
  constructor() {
    super(
      'username must be 3-20 characters: ASCII letters, digits and underscore',
    );
    this.name = 'InvalidUsernameError';
  }
}

/**
 * Value Object: a valid username, always in lower case so that uniqueness is
 * case-insensitive ("Ronald" and "ronald" are the same user, data-model
 * `users`). Once created it is always valid; it has no identity of its own.
 */
export class Username {
  private constructor(readonly value: string) {}

  /**
   * Checks the rule on the raw text and only then lower-cases it: some
   * non-ASCII characters (the Kelvin sign 'K') become ASCII letters when
   * lower-cased and would otherwise slip through.
   */
  static create(raw: string): Username {
    if (!USERNAME_PATTERN.test(raw)) {
      throw new InvalidUsernameError();
    }
    return new Username(raw.toLowerCase());
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }
}
