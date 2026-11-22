import { ApiProperty } from '@nestjs/swagger';

import type { AuthSession } from '../../../application/use-cases/session-issuer';
import { ROLES, type Role } from '../../../domain/user/role';

/** The `user` part of an auth response (api-contracts §3). */
export class AuthUserResponse {
  @ApiProperty({ example: '7f1c0000-0000-4000-8000-000000000001' })
  readonly id!: string;

  @ApiProperty({ example: 'ronald_g', description: 'Always in lower case' })
  readonly username!: string;

  @ApiProperty({ enum: ROLES, example: 'player' })
  readonly role!: Role;
}

/** Body returned by register, login and refresh (api-contracts §3). */
export class AuthSessionResponse {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  readonly accessToken!: string;

  @ApiProperty({ example: '2027-02-20T10:00:00.000Z' })
  readonly expiresAt!: string;

  @ApiProperty({ type: AuthUserResponse })
  readonly user!: AuthUserResponse;
}

/** Turns the use case's session into the contract's JSON (dates in ISO). */
export function toAuthSessionResponse(
  session: AuthSession,
): AuthSessionResponse {
  return {
    accessToken: session.accessToken,
    expiresAt: session.expiresAt.toISOString(),
    user: { ...session.user },
  };
}
