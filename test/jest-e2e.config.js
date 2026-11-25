/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  roots: ['<rootDir>/test'],
  testRegex: '\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  globalSetup: '<rootDir>/test/global-setup-e2e.ts',
  setupFiles: ['<rootDir>/test/setup-e2e.ts'],
  // Every e2e file shares one database, so files run one after another: in
  // parallel, rows one file inserts (Hexa Sort levels, for example) break
  // another file's exact assertions. Source: Jest docs, CLI `--maxWorkers`.
  maxWorkers: 1,
};
