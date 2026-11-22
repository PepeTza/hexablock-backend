import { compare, hash } from 'bcrypt';

import { IPasswordHasher } from '../../application/ports/password-hasher';
import { MAX_PASSWORD_BYTES } from '../../domain/user/password-rules';

/**
 * bcrypt work factor: each step doubles the time to compute a hash. 12 takes
 * a fraction of a second per login and makes guessing passwords slow. Source:
 * OWASP, "Password Storage Cheat Sheet", bcrypt section (work factor of at
 * least 10, 72-byte input limit):
 * https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
export const DEFAULT_BCRYPT_COST = 12;

/**
 * Adapter: implements `IPasswordHasher` with bcrypt, which salts every hash
 * so two equal passwords never get the same hash. bcrypt only reads the
 * first 72 bytes, which is why the contract limits passwords to 72 bytes
 * (decision 21).
 */
export class BcryptPasswordHasher implements IPasswordHasher {
  private dummyHash: Promise<string> | undefined;

  constructor(private readonly cost: number = DEFAULT_BCRYPT_COST) {}

  hash(password: string): Promise<string> {
    return hash(password, this.cost);
  }

  async matches(
    password: string,
    passwordHash: string | null,
  ): Promise<boolean> {
    const tooLong = Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES;
    // Two failures share this branch: no user (compare with the dummy hash)
    // and a password over the limit (compare with the real hash and ignore
    // the result, since bcrypt would accept it by truncating). Both still do
    // a full comparison, so a failure is never faster than a real login.
    if (passwordHash === null || tooLong) {
      await compare(password, passwordHash ?? (await this.getDummyHash()));
      return false;
    }
    return compare(password, passwordHash);
  }

  /**
   * Computed once, with the same cost as real hashes. A failed attempt is
   * forgotten, so the next login retries instead of failing forever.
   */
  private getDummyHash(): Promise<string> {
    this.dummyHash ??= hash('no-user-has-this-password', this.cost).catch(
      (error: unknown) => {
        this.dummyHash = undefined;
        throw error;
      },
    );
    return this.dummyHash;
  }
}
