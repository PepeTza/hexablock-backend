import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { AuthController } from '../../adapters/http/auth/auth.controller';
import { TOKEN_SERVICE } from '../../adapters/http/auth/auth.tokens';
import { JwtAuthGuard } from '../../adapters/http/auth/jwt-auth.guard';
import { PrismaUserRepository } from '../../adapters/persistence/prisma-user-repository';
import { BcryptPasswordHasher } from '../../adapters/security/bcrypt-password-hasher';
import { JwtTokenService } from '../../adapters/security/jwt-token-service';
import { SystemClock } from '../../adapters/system-clock';
import type { IClock } from '../../application/ports/clock';
import type { IPasswordHasher } from '../../application/ports/password-hasher';
import type { ITokenService } from '../../application/ports/token-service';
import type { IUserRepository } from '../../application/ports/user-repository';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { SessionIssuer } from '../../application/use-cases/session-issuer';
import type { Environment } from '../config/environment';
import { PrismaService } from '../prisma/prisma.service';
import { CLOCK, PASSWORD_HASHER, USER_REPOSITORY } from './auth.tokens';

/**
 * Wires the auth endpoints: each port gets its adapter, and the use cases,
 * plain classes, are built with `useFactory`. Exports the token service and
 * the JWT guard so later modules can protect their routes.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        secret: config.get('jwtSecret', { infer: true }),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useFactory: (prisma: PrismaService): IUserRepository =>
        new PrismaUserRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: PASSWORD_HASHER,
      useFactory: (): IPasswordHasher => new BcryptPasswordHasher(),
    },
    {
      provide: TOKEN_SERVICE,
      useFactory: (jwt: JwtService): ITokenService => new JwtTokenService(jwt),
      inject: [JwtService],
    },
    { provide: CLOCK, useFactory: (): IClock => new SystemClock() },
    {
      provide: SessionIssuer,
      useFactory: (tokens: ITokenService, clock: IClock) =>
        new SessionIssuer(tokens, clock),
      inject: [TOKEN_SERVICE, CLOCK],
    },
    {
      provide: RegisterUserUseCase,
      useFactory: (
        users: IUserRepository,
        hasher: IPasswordHasher,
        sessions: SessionIssuer,
      ) => new RegisterUserUseCase(users, hasher, sessions),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, SessionIssuer],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        users: IUserRepository,
        hasher: IPasswordHasher,
        sessions: SessionIssuer,
      ) => new LoginUseCase(users, hasher, sessions),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, SessionIssuer],
    },
    {
      provide: RefreshTokenUseCase,
      useFactory: (users: IUserRepository, sessions: SessionIssuer) =>
        new RefreshTokenUseCase(users, sessions),
      inject: [USER_REPOSITORY, SessionIssuer],
    },
    JwtAuthGuard,
  ],
  exports: [TOKEN_SERVICE, JwtAuthGuard],
})
export class AuthModule {}
