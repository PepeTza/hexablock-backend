import { SetMetadata } from '@nestjs/common';

import type { Role } from '../../../domain/user/role';

/** Metadata key under which `@Roles()` stores the roles of a route. */
export const ROLES_KEY = 'roles';

/**
 * Marks a route (or a whole controller) as open only to these roles, for
 * `RolesGuard`. Example: `@Roles('admin')` is the contract's "admin" access
 * level (api-contracts §1).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
