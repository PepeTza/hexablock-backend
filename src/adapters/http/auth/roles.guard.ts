import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApplicationError } from '../../../application/errors/application-error';
import {
  INSUFFICIENT_ROLE_MESSAGE,
  INVALID_TOKEN_MESSAGE,
} from '../../../application/errors/auth-messages';
import type { Role } from '../../../domain/user/role';
import type { AuthenticatedRequest } from './jwt-auth.guard';
import { ROLES_KEY } from './roles.decorator';

/**
 * Aspect (guard): the role-based access levels of the contract. Runs after
 * `JwtAuthGuard` and lets the request through only when the token's role is
 * one of the route's `@Roles()`; otherwise `403`. A route without `@Roles()`
 * is not restricted by role. A new role only needs `@Roles()` on its
 * routes: this guard does not change (OCP).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (roles === undefined || roles.length === 0) {
      return true;
    }
    const { claims } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    if (claims === undefined) {
      // JwtAuthGuard must run first; without claims there is no identity.
      throw new ApplicationError('unauthorized', INVALID_TOKEN_MESSAGE);
    }
    if (!roles.includes(claims.role)) {
      throw new ApplicationError('forbidden', INSUFFICIENT_ROLE_MESSAGE);
    }
    return true;
  }
}
