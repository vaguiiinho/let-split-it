import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';
import { GroupName } from '../../domain/value-objects/group-name.vo';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findGroupOrFail } from '../find-group-or-fail';

export type UpdateGroupInput = { groupId: string; name: string };
export type UpdateGroupOutput = GroupDetailOutput;

export class UpdateGroupUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: UpdateGroupInput): Promise<UpdateGroupOutput> {
    const groupId = UniqueEntityId.create(input.groupId);
    const name = GroupName.create(input.name);
    const group = await findGroupOrFail(this.repo, groupId);
    group.rename(name);
    await this.repo.save(group);
    return toGroupDetailOutput(group);
  }
}
