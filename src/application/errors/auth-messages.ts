// Messages of the auth errors, shared by the use cases and the adapters that
// raise the same errors (api-contracts §3). They live next to
// `ApplicationError` so no adapter depends on a concrete use case.

/** `409` on register. */
export const USERNAME_TAKEN_MESSAGE = 'username already taken';

/** The only message of a failed login (CU-11 A1). */
export const INVALID_CREDENTIALS_MESSAGE = 'invalid username or password';

/** Every rejected token: expired, tampered with or for a deleted user. */
export const INVALID_TOKEN_MESSAGE = 'invalid or expired token';

export const INSUFFICIENT_ROLE_MESSAGE = 'insufficient role';
