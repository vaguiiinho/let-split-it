import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Actor } from '../../../shared/domain/actor';
import { ForbiddenError } from '../../../shared/domain/errors';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../../shared/presentation/auth.decorators';
import { AuthenticateTokenUseCase } from '../application/use-cases/authenticate-token.use-case';

/** Guard global (D3): nega por padrão; `@Public()` libera; `@Roles()` restringe por papel. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authenticate: AuthenticateTokenUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const req = context.switchToHttp().getRequest<Request & { actor?: Actor }>();
    const actor = await this.authenticate.execute({ authorization: req.headers.authorization });
    req.actor = actor;

    const roles = this.reflector.getAllAndOverride<Actor['role'][] | undefined>(ROLES_KEY, targets);
    if (roles && roles.length > 0 && !roles.includes(actor.role)) {
      throw new ForbiddenError('Acesso negado');
    }
    return true;
  }
}
