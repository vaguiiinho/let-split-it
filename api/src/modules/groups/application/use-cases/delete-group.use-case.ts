import type { Actor } from '../../../../shared/domain/actor';
import { NotFoundError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';
import { assertCanManage, findAccessibleGroupOrFail } from '../group-access.policy';

export type DeleteGroupInput = { actor: Actor; groupId: string };
export type DeleteGroupOutput = void;

export class DeleteGroupUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: DeleteGroupInput): Promise<DeleteGroupOutput> {
    const id = UniqueEntityId.create(input.groupId);
    const group = await findAccessibleGroupOrFail(this.repo, id, input.actor);
    assertCanManage(input.actor, group);
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError('Rolê não encontrado');
  }
}
