/**
 * Injection tokens for the auth ports. Interfaces do not exist at runtime, so
 * Nest needs a key; these are wiring details of Nest, not part of the ports.
 * `TOKEN_SERVICE` lives in the adapters layer because a guard injects it.
 */
export const USER_REPOSITORY = Symbol('IUserRepository');
export const PASSWORD_HASHER = Symbol('IPasswordHasher');
export const CLOCK = Symbol('IClock');
