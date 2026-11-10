import { NotFoundError } from '../../../shared/domain/errors';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Group } from '../domain/group.aggregate';
import { GroupRepository } from '../domain/group.repository';

export async function findGroupOrFail(repo: GroupRepository, id: UniqueEntityId): Promise<Group> {
  const group = await repo.findById(id);
  if (!group) throw new NotFoundError('Rolê não encontrado');
  return group;
}
