const fs = require('node:fs');
const path = require('node:path');

// Layers that must keep at least 80 % coverage (CONTRIBUTING §5, D-05).
const COVERED_LAYERS = ['src/domain', 'src/application'];
const MINIMUM = { statements: 80, branches: 80, functions: 80, lines: 80 };

// Jest fails when a threshold path has no coverage data, so a layer is only
// enforced once its folder exists. No change is needed here when it appears.
const coverageThreshold = Object.fromEntries(
  COVERED_LAYERS.filter((layer) =>
    fs.existsSync(path.join(__dirname, layer)),
  ).map((layer) => [`./${layer}/`, MINIMUM]),
);

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '\.spec\.ts$',
  transform: { '^.+\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
  coverageThreshold,
};
