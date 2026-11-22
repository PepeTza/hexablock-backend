/**
 * Injection token for `ITokenService`. It lives in the adapters layer, not in
 * frameworks, because `JwtAuthGuard` (an adapter) injects it and adapters
 * cannot import frameworks (layer lint).
 */
export const TOKEN_SERVICE = Symbol('ITokenService');
