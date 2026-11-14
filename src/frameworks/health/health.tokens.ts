/**
 * Injection token for `IDatabaseProbe`. Interfaces do not exist at runtime,
 * so Nest needs a key; it lives here because it is a wiring detail of Nest,
 * not part of the port.
 */
export const DATABASE_PROBE = Symbol('IDatabaseProbe');
