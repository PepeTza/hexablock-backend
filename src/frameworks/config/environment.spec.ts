import { validateEnvironment } from './environment';

const VALID_DATABASE_URL =
  'postgresql://hexablock:hexablock@localhost:5432/hexablock';
const VALID_JWT_SECRET = 'a-test-secret-with-at-least-32-chars';

/** The variables every valid environment needs. */
const REQUIRED = {
  DATABASE_URL: VALID_DATABASE_URL,
  JWT_SECRET: VALID_JWT_SECRET,
};

describe('validateEnvironment', () => {
  it('should_return_typed_environment_when_all_variables_are_valid', () => {
    // Arrange
    const variables = { ...REQUIRED, PORT: '8080' };

    // Act
    const environment = validateEnvironment(variables);

    // Assert
    expect(environment).toEqual({
      databaseUrl: VALID_DATABASE_URL,
      port: 8080,
      nodeEnv: 'development',
      jwtSecret: VALID_JWT_SECRET,
    });
  });

  it('should_throw_naming_the_variable_when_database_url_is_missing', () => {
    // Arrange
    const variables = { PORT: '8080' };

    // Act
    const act = () => validateEnvironment(variables);

    // Assert
    expect(act).toThrow('DATABASE_URL is required');
  });

  it('should_throw_when_database_url_is_not_a_postgres_url', () => {
    // Arrange
    const variables = { DATABASE_URL: 'mysql://localhost:3306/hexablock' };

    // Act
    const act = () => validateEnvironment(variables);

    // Assert
    expect(act).toThrow('DATABASE_URL must be a postgresql:// URL');
  });

  it('should_use_port_3000_when_port_is_not_set', () => {
    // Arrange
    const variables = { ...REQUIRED };

    // Act
    const environment = validateEnvironment(variables);

    // Assert
    expect(environment.port).toBe(3000);
  });

  it('should_throw_when_port_is_not_a_number', () => {
    // Arrange
    const variables = { DATABASE_URL: VALID_DATABASE_URL, PORT: 'abc' };

    // Act
    const act = () => validateEnvironment(variables);

    // Assert
    expect(act).toThrow('PORT must be an integer between 1 and 65535');
  });

  it('should_list_every_problem_when_several_variables_are_invalid', () => {
    // Arrange
    const variables = { PORT: '0' };

    // Act
    const act = () => validateEnvironment(variables);

    // Assert
    expect(act).toThrow(
      'Invalid environment: DATABASE_URL is required; PORT must be an integer between 1 and 65535; JWT_SECRET is required',
    );
  });

  it('should_default_node_env_to_development', () => {
    // Arrange
    const variables = { ...REQUIRED };

    // Act
    const environment = validateEnvironment(variables);

    // Assert
    expect(environment.nodeEnv).toBe('development');
  });

  it('should_read_node_env_when_it_is_production', () => {
    // Arrange
    const variables = { ...REQUIRED, NODE_ENV: 'production' };

    // Act
    const environment = validateEnvironment(variables);

    // Assert
    expect(environment.nodeEnv).toBe('production');
  });

  it('should_reject_an_unknown_node_env', () => {
    // Arrange
    const variables = { DATABASE_URL: VALID_DATABASE_URL, NODE_ENV: 'prod' };

    // Act
    const act = () => validateEnvironment(variables);

    // Assert
    expect(act).toThrow(
      'NODE_ENV must be one of development, test, production',
    );
  });

  it.each([
    ['missing', undefined, 'JWT_SECRET is required'],
    ['empty', '', 'JWT_SECRET is required'],
    [
      'shorter than 32',
      'only-31-characters-long-secret!',
      'JWT_SECRET must be at least 32 characters',
    ],
  ])(
    'should_reject_the_environment_when_jwt_secret_is_missing_or_shorter_than_32 (%s)',
    (_case, secret, message) => {
      // Arrange
      const variables = {
        DATABASE_URL: VALID_DATABASE_URL,
        JWT_SECRET: secret,
      };

      // Act
      const act = () => validateEnvironment(variables);

      // Assert
      expect(act).toThrow(message);
    },
  );
});
