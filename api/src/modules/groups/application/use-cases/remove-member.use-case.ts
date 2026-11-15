import type { Actor } from '../../../../shared/domain/actor';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findAccessibleGroupOrFail } from '../group-access.policy';

export type RemoveMemberInput = { actor: Actor; groupId: string; memberId: string };
export type RemoveMemberOutput = GroupDetailOutput;

export class RemoveMemberUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: RemoveMemberInput): Promise<RemoveMemberOutput> {
    const groupId = UniqueEntityId.create(input.groupId);
    const memberId = UniqueEntityId.create(input.memberId);
    const group = await findAccessibleGroupOrFail(this.repo, groupId, input.actor);
    group.removeMember(memberId);
    await this.repo.save(group);
    return toGroupDetailOutput(group);
  }
}
