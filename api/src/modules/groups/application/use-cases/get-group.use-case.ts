import type { Actor } from '../../../../shared/domain/actor';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findAccessibleGroupOrFail } from '../group-access.policy';

export type GetGroupInput = { actor: Actor; groupId: string };
export type GetGroupOutput = GroupDetailOutput;

export class GetGroupUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: GetGroupInput): Promise<GetGroupOutput> {
    const group = await findAccessibleGroupOrFail(this.repo, UniqueEntityId.create(input.groupId), input.actor);
    return toGroupDetailOutput(group);
  }
}
