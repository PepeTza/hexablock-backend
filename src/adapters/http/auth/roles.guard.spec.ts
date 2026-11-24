import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApplicationError } from '../../../application/errors/application-error';
import type { TokenClaims } from '../../../application/ports/token-service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

class FakeController {
  @Roles('admin')
  adminOnly(this: void): void {}

  open(this: void): void {}
}

const ADMIN: TokenClaims = { userId: 'u1', username: 'ana', role: 'admin' };
const PLAYER: TokenClaims = { userId: 'u2', username: 'bob', role: 'player' };

/** A minimal HTTP context for one handler of `FakeController`. */
function contextFor(
  handler: keyof FakeController,
  claims: TokenClaims | undefined,
): ExecutionContext {
  const context = {
    getHandler: () => FakeController.prototype[handler],
    getClass: () => FakeController,
    switchToHttp: () => ({ getRequest: () => ({ claims }) }),
  };
  // Test fake: only the methods RolesGuard calls are provided.
  return context as unknown as ExecutionContext;
}

function errorOf(action: () => unknown): ApplicationError | undefined {
  try {
    action();
  } catch (error) {
    if (error instanceof ApplicationError) {
      return error;
    }
    throw error;
  }
  return undefined;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('should_allow_the_request_when_the_role_is_listed', () => {
    // Act
    const allowed = guard.canActivate(contextFor('adminOnly', ADMIN));

    // Assert
    expect(allowed).toBe(true);
  });

  it('should_reject_with_forbidden_when_the_role_is_not_listed', () => {
    // Act
    const error = errorOf(() =>
      guard.canActivate(contextFor('adminOnly', PLAYER)),
    );

    // Assert
    expect(error?.kind).toBe('forbidden');
    expect(error?.message).toBe('insufficient role');
  });

  it('should_allow_the_request_when_the_route_has_no_roles', () => {
    // Act
    const allowed = guard.canActivate(contextFor('open', PLAYER));

    // Assert
    expect(allowed).toBe(true);
  });

  it('should_reject_with_unauthorized_when_the_request_has_no_claims', () => {
    // Act
    const error = errorOf(() =>
      guard.canActivate(contextFor('adminOnly', undefined)),
    );

    // Assert
    expect(error?.kind).toBe('unauthorized');
  });
});
