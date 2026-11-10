import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';
import { MemberName } from '../../domain/value-objects/member-name.vo';
import { PixKey } from '../../domain/value-objects/pix-key.vo';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findGroupOrFail } from '../find-group-or-fail';

export type AddMemberInput = { groupId: string; name: string; pixKey?: string | null };
export type AddMemberOutput = GroupDetailOutput;

export class AddMemberUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: AddMemberInput): Promise<AddMemberOutput> {
    const groupId = UniqueEntityId.create(input.groupId);
    const name = MemberName.create(input.name);
    const pixKey = PixKey.createOptional(input.pixKey);
    const group = await findGroupOrFail(this.repo, groupId);
    group.addMember(name, pixKey);
    await this.repo.save(group);
    return toGroupDetailOutput(group);
  }
}
