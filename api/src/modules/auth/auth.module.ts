import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Clock, CLOCK } from '../../shared/domain/clock.port';
import {
  GROUP_INVITE_REPOSITORY,
  GroupInviteRepository,
} from '../groups/domain/group-invite.repository';
import { GroupsModule } from '../groups/groups.module';
import { PASSWORD_HASHER, PasswordHasher } from '../users/domain/password-hasher.port';
import { USER_REPOSITORY, UserRepository } from '../users/domain/user.repository';
import { UsersModule } from '../users/users.module';
import { AuthenticateTokenUseCase } from './application/use-cases/authenticate-token.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { TOKEN_SERVICE, TokenService } from './domain/token-service.port';
import { AuthConfig, loadAuthConfig } from './infrastructure/auth.config';
import { HmacJwtTokenService } from './infrastructure/hmac-jwt-token.service';
import { AuthController } from './presentation/auth.controller';
import { AuthGuard } from './presentation/auth.guard';

const AUTH_CONFIG = Symbol('AUTH_CONFIG');

@Module({
  imports: [UsersModule, GroupsModule],
  controllers: [AuthController],
  providers: [
    // Falha no boot (antes do listen) se o segredo for inválido em produção (A5).
    { provide: AUTH_CONFIG, useFactory: (): AuthConfig => loadAuthConfig(process.env) },
    {
      provide: TOKEN_SERVICE,
      useFactory: (config: AuthConfig, clock: Clock) => new HmacJwtTokenService(config.jwtSecret, clock),
      inject: [AUTH_CONFIG, CLOCK],
    },
    {
      provide: LoginUseCase,
      useFactory: (users: UserRepository, hasher: PasswordHasher, tokens: TokenService) =>
        new LoginUseCase(users, hasher, tokens),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE],
    },
    {
      provide: GetCurrentUserUseCase,
      useFactory: (users: UserRepository, invites: GroupInviteRepository) =>
        new GetCurrentUserUseCase(users, invites),
      inject: [USER_REPOSITORY, GROUP_INVITE_REPOSITORY],
    },
    {
      provide: AuthenticateTokenUseCase,
      useFactory: (tokens: TokenService, users: UserRepository) =>
        new AuthenticateTokenUseCase(tokens, users),
      inject: [TOKEN_SERVICE, USER_REPOSITORY],
    },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
