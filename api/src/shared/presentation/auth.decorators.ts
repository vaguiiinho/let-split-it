import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Actor } from '../domain/actor';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Libera a rota da autenticação (o padrão é negar). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restringe a rota aos papéis informados. */
export const Roles = (...roles: Actor['role'][]) => SetMetadata(ROLES_KEY, roles);

/** Injeta o `Actor` gravado pelo AuthGuard em `request.actor`. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest<{ actor: Actor }>();
  return req.actor;
});
