import { Prisma } from '@prisma/client';

import { ApplicationError } from '../../application/errors/application-error';
import { User } from '../../domain/user/user';
import { Username } from '../../domain/user/username';
import { PrismaUserRepository, UserClient } from './prisma-user-repository';

const ROW = {
  id: '7f1c0000-0000-4000-8000-000000000001',
  username: 'ronald_g',
  passwordHash: '$2b$12$hash',
  role: 'player' as const,
  createdAt: new Date('2026-11-22T10:00:00Z'),
};

/** Fake Prisma client whose `user` delegate behaves as the test decides. */
function fakeClient(create: () => Promise<unknown>): UserClient {
  return {
    user: {
      create,
      findUnique: () => Promise.resolve(ROW),
    },
  } as unknown as UserClient;
}

describe('PrismaUserRepository', () => {
  it('should_return_the_stored_user_with_its_id_when_created', async () => {
    // Arrange
    const repository = new PrismaUserRepository(
      fakeClient(() => Promise.resolve(ROW)),
    );
    const newUser = User.register(Username.create('ronald_g'), '$2b$12$hash');

    // Act
    const user = await repository.create(newUser);

    // Assert
    expect(user.id).toBe(ROW.id);
    expect(user.username.value).toBe('ronald_g');
    expect(user.role).toBe('player');
  });

  it('should_throw_conflict_when_prisma_reports_a_duplicate_username', async () => {
    // Arrange: two registrations raced and the unique index stopped one.
    const duplicate = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`username`)',
      { code: 'P2002', clientVersion: '7.10.1' },
    );
    const repository = new PrismaUserRepository(
      fakeClient(() => Promise.reject(duplicate)),
    );
    const newUser = User.register(Username.create('ronald_g'), '$2b$12$hash');

    // Act
    const create = repository.create(newUser);

    // Assert
    await expect(create).rejects.toEqual(
      new ApplicationError('conflict', 'username already taken'),
    );
  });

  it('should_find_a_user_by_name_and_by_id_when_stored', async () => {
    // Arrange
    const repository = new PrismaUserRepository(
      fakeClient(() => Promise.resolve(ROW)),
    );

    // Act
    const byName = await repository.findByUsername(Username.create('ronald_g'));
    const byId = await repository.findById(ROW.id);

    // Assert
    expect(byName?.id).toBe(ROW.id);
    expect(byId?.username.value).toBe('ronald_g');
  });
});
