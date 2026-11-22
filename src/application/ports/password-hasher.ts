/**
 * Port: turns a password into a one-way hash and checks a password against
 * one (RNF-10). The use cases never know which algorithm is used.
 */
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  /**
   * With `hash = null` (no such user) it still spends the time of a real
   * comparison and returns `false`, so response times do not reveal whether
   * a username exists.
   */
  matches(password: string, hash: string | null): Promise<boolean>;
}
