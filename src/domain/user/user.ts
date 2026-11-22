import type { Role } from './role';
import type { Username } from './username';

/** A user that is not stored yet: the database assigns its `id`. */
export interface NewUser {
  readonly username: Username;
  readonly passwordHash: string;
  readonly role: Role;
}

/** Everything a stored user has. */
export interface UserProps extends NewUser {
  readonly id: string;
}

/**
 * Entity: a player or administrator account (domain-model "User"). Its
 * identity is `id`; the name is unique and the password is kept only as a
 * hash, never in plain text (RNF-10).
 */
export class User {
  readonly id: string;
  readonly username: Username;
  readonly passwordHash: string;
  readonly role: Role;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.username = props.username;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
  }

  /**
   * A new account is always a player (api-contracts §3): nobody can register
   * as an administrator.
   */
  static register(username: Username, passwordHash: string): NewUser {
    assertHash(passwordHash);
    return { username, passwordHash, role: 'player' };
  }

  /** Rebuilds a user read from storage, keeping its stored role. */
  static restore(props: UserProps): User {
    assertHash(props.passwordHash);
    return new User(props);
  }
}

function assertHash(passwordHash: string): void {
  if (passwordHash === '') {
    throw new Error('A user needs a password hash');
  }
}
