/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  roots: ['<rootDir>/test'],
  testRegex: '\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  globalSetup: '<rootDir>/test/global-setup-e2e.ts',
  setupFiles: ['<rootDir>/test/setup-e2e.ts'],
};
