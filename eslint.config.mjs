// ESLint flat config: the TypeScript baseline shared with the client plus
// the Clean Architecture layer boundaries (eslint-boundaries.config.js, issue #6).
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

import boundaries from './eslint-boundaries.config.js';

const { layerBoundaries } = boundaries;

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      '**/*.config.js',
      '**/*.config.mjs',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // CONTRIBUTING §4: no `any`; use `unknown` and narrow.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      // AGENTS.md §3: no type assertions (`as`, `<T>value`, except `as const`)
      // or non-null assertions (`!`) in production code.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      // AGENTS.md §3: no `instanceof` in domain or application code.
      'no-restricted-syntax': [
        'error',
        {
          selector: "BinaryExpression[operator='instanceof']",
          message:
            'Do not use instanceof in domain or application code; use polymorphism or Either/domain error results (AGENTS.md §3). Adapters and frameworks may use instanceof to translate NestJS/Prisma exceptions.',
        },
      ],
    },
  },
  {
    // Temporary legacy exceptions tracked in #62 — remove each file as it is migrated.
    files: [
      'src/application/use-cases/login.use-case.ts',
      'src/application/use-cases/submit-score.use-case.ts',
      'src/application/use-cases/sync-progress.use-case.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Temporary legacy exceptions tracked in #51 — remove each file as it is migrated.
    files: [
      'src/adapters/http/auth/login-throttler.guard.ts',
      'src/adapters/http/errors/error-response.ts',
      'src/adapters/http/scores/score-throttler.guard.ts',
      'src/adapters/security/jwt-token-service.ts',
    ],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },
  ...layerBoundaries(),
  // Must stay last: turns off rules that conflict with Prettier.
  prettier,
);
