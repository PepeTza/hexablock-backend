/** Shortest password a player may choose (decision 21). */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Longest password, in UTF-8 bytes (decision 21). The limit comes from
 * bcrypt, which ignores everything after the first 72 bytes, but it is a rule
 * of the contract: register rejects longer passwords and login never matches
 * them, so nothing is ever truncated silently. Every character takes at least
 * one byte, so this also caps a password at 72 characters.
 */
export const MAX_PASSWORD_BYTES = 72;
