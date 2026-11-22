import { Prisma, PrismaClient, User as UserRow } from '@prisma/client';

import { ApplicationError } from '../../application/errors/application-error';
import { IUserRepository } from '../../application/ports/user-repository';
import { USERNAME_TAKEN_MESSAGE } from '../../application/use-cases/register-user.use-case';
import { NewUser, User } from '../../domain/user/user';
import { Username } from '../../domain/user/username';

/** The only part of Prisma the repository needs; lets tests pass a fake. */
export type UserClient = Pick<PrismaClient, 'user'>;

// Prisma's code for a unique index violation.
const UNIQUE_VIOLATION = 'P2002';

/**
 * Adapter: implements `IUserRepository` on the `users` table with Prisma.
 * Translates rows into domain `User`s and Prisma errors into
 * `ApplicationError`s, so nothing above this class knows about Prisma.
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly client: UserClient) {}

  async findByUsername(username: Username): Promise<User | null> {
    const row = await this.client.user.findUnique({
      where: { username: username.value },
    });
    return row ? toUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.client.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async create(user: NewUser): Promise<User> {
    try {
      const row = await this.client.user.create({
        data: {
          username: user.username.value,
          passwordHash: user.passwordHash,
          role: user.role,
        },
      });
      return toUser(row);
    } catch (error) {
      // Two registrations of the same name raced: the unique index of
      // `users.username` stopped the second one.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new ApplicationError('conflict', USERNAME_TAKEN_MESSAGE);
      }
      throw error;
    }
  }
}

function toUser(row: UserRow): User {
  return User.restore({
    id: row.id,
    username: Username.create(row.username),
    passwordHash: row.passwordHash,
    role: row.role,
  });
}
