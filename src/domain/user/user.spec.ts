import { User } from './user';
import { Username } from './username';

const HASH = '$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

describe('User', () => {
  it('should_create_a_player_when_a_user_registers', () => {
    // Arrange
    const username = Username.create('ronald_g');

    // Act
    const newUser = User.register(username, HASH);

    // Assert
    expect(newUser).toEqual({ username, passwordHash: HASH, role: 'player' });
  });

  it('should_keep_the_stored_role_when_restoring_a_user', () => {
    // Arrange
    const username = Username.create('admin_1');

    // Act
    const user = User.restore({
      id: '7f1c0000-0000-4000-8000-000000000001',
      username,
      passwordHash: HASH,
      role: 'admin',
    });

    // Assert
    expect(user.id).toBe('7f1c0000-0000-4000-8000-000000000001');
    expect(user.username).toBe(username);
    expect(user.role).toBe('admin');
  });

  it('should_reject_the_user_when_the_password_hash_is_empty', () => {
    // Arrange
    const username = Username.create('ronald_g');

    // Act
    const register = (): unknown => User.register(username, '');

    // Assert
    expect(register).toThrow('A user needs a password hash');
  });
});
