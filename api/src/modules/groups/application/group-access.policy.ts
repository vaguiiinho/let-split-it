import type { Actor } from '../../../shared/domain/actor';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Group } from '../domain/group.aggregate';
import { GroupRepository } from '../domain/group.repository';

export { scopeFor } from '../../../shared/domain/scope-for';

/** R1: ADMIN, dono ou participante. */
export function canView(actor: Actor, group: Group): boolean {
  return (
    actor.role === 'ADMIN' ||
    group.ownerId?.value === actor.userId ||
    group.members.some((m) => m.id.value === actor.personId)
  );
}

/** R2: ADMIN ou dono. */
export function canManage(actor: Actor, group: Group): boolean {
  return actor.role === 'ADMIN' || group.ownerId?.value === actor.userId;
}

/** R3: inexistente ou invisível → 404 (não revela que o rolê existe). */
export async function findAccessibleGroupOrFail(
  repo: GroupRepository,
  id: UniqueEntityId,
  actor: Actor,
): Promise<Group> {
  const group = await repo.findById(id);
  if (!group || !canView(actor, group)) throw new NotFoundError('Rolê não encontrado');
  return group;
}

/** R2/R3: visível, mas sem poder de gestão → 403. */
export function assertCanManage(actor: Actor, group: Group): void {
  if (!canManage(actor, group)) throw new ForbiddenError('Acesso negado');
}
