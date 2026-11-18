import { Linter } from 'eslint';

import { layerBoundaries } from './eslint-boundaries.config';

// Fixture: the boundary rules are run on small snippets with a fake file
// name, so no file with a forbidden import exists in the repository.
const config: Linter.Config[] = [{ files: ['**/*.ts'] }, ...layerBoundaries()];

function lint(filename: string, code: string): string[] {
  const linter = new Linter();
  return linter
    .verify(code, config, { filename })
    .map((message) => message.ruleId ?? message.message);
}

const RESTRICTED = 'no-restricted-imports';

describe('layer boundaries', () => {
  it('should_report_error_when_domain_imports_nestjs_or_prisma', () => {
    // Arrange
    const code = [
      "import { Injectable } from '@nestjs/common';",
      "import { PrismaClient } from '@prisma/client';",
    ].join('\n');

    // Act
    const errors = lint('src/domain/identity/user.ts', code);

    // Assert
    expect(errors).toEqual([RESTRICTED, RESTRICTED]);
  });

  it('should_report_error_when_domain_imports_application_or_frameworks', () => {
    // Arrange
    const code = [
      "import { LoginUseCase } from '../../application/use-cases/login.use-case';",
      "import { PrismaService } from '../../frameworks/prisma/prisma.service';",
    ].join('\n');

    // Act
    const errors = lint('src/domain/identity/user.ts', code);

    // Assert
    expect(errors).toEqual([RESTRICTED, RESTRICTED]);
  });

  it('should_pass_when_domain_imports_relative_domain_file', () => {
    // Arrange
    const code = "import { UserId } from './user-id';";

    // Act
    const errors = lint('src/domain/identity/user.ts', code);

    // Assert
    expect(errors).toEqual([]);
  });

  it('should_report_error_when_application_imports_adapters', () => {
    // Arrange
    const code =
      "import { PrismaUserRepository } from '../../adapters/persistence/prisma-user-repository';";

    // Act
    const errors = lint('src/application/use-cases/login.use-case.ts', code);

    // Assert
    expect(errors).toEqual([RESTRICTED]);
  });

  it('should_report_error_when_application_imports_frameworks', () => {
    // Arrange
    const code =
      "import { PrismaService } from '../../frameworks/prisma/prisma.service';";

    // Act
    const errors = lint('src/application/use-cases/login.use-case.ts', code);

    // Assert
    expect(errors).toEqual([RESTRICTED]);
  });

  it('should_pass_when_application_imports_domain_and_ports', () => {
    // Arrange
    const code = [
      "import { User } from '../../domain/identity/user';",
      "import { IUserRepository } from '../ports/user-repository';",
    ].join('\n');

    // Act
    const errors = lint('src/application/use-cases/login.use-case.ts', code);

    // Assert
    expect(errors).toEqual([]);
  });

  it('should_report_error_when_adapters_import_frameworks', () => {
    // Arrange
    const code =
      "import { PrismaService } from '../../frameworks/prisma/prisma.service';";

    // Act
    const errors = lint(
      'src/adapters/persistence/prisma-user-repository.ts',
      code,
    );

    // Assert
    expect(errors).toEqual([RESTRICTED]);
  });

  it('should_pass_when_adapters_import_application_and_domain', () => {
    // Arrange
    const code = [
      "import { CheckHealthUseCase } from '../../application/use-cases/check-health.use-case';",
      "import { User } from '../../domain/identity/user';",
    ].join('\n');

    // Act
    const errors = lint('src/adapters/http/health/health.controller.ts', code);

    // Assert
    expect(errors).toEqual([]);
  });

  it('should_pass_when_frameworks_import_any_layer_or_package', () => {
    // Arrange
    const code = [
      "import { Module } from '@nestjs/common';",
      "import { HealthController } from '../../adapters/http/health/health.controller';",
      "import { CheckHealthUseCase } from '../../application/use-cases/check-health.use-case';",
      "import { User } from '../../domain/identity/user';",
    ].join('\n');

    // Act
    const errors = lint('src/frameworks/health/health.module.ts', code);

    // Assert
    expect(errors).toEqual([]);
  });
});
