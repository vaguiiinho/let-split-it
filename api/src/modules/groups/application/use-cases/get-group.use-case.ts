import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findGroupOrFail } from '../find-group-or-fail';

export type GetGroupInput = { groupId: string };
export type GetGroupOutput = GroupDetailOutput;

export class GetGroupUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: GetGroupInput): Promise<GetGroupOutput> {
    const group = await findGroupOrFail(this.repo, UniqueEntityId.create(input.groupId));
    return toGroupDetailOutput(group);
  }
}
