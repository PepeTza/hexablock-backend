import type { NewUser, User } from '../../domain/user/user';
import type { Username } from '../../domain/user/username';

/**
 * Port: where users are stored (domain-model, repository ports). The use
 * cases depend on this interface; the Prisma adapter implements it (DIP).
 */
export interface IUserRepository {
  findByUsername(username: Username): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /**
   * Stores a new user and returns it with its `id`. Throws
   * `ApplicationError('conflict')` when the name is already taken, even if
   * two registrations race.
   */
  create(user: NewUser): Promise<User>;
}
