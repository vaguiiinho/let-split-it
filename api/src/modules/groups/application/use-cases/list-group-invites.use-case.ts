import type { Actor } from '../../../../shared/domain/actor';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupInviteRepository } from '../../domain/group-invite.repository';
import { GroupRepository } from '../../domain/group.repository';
import { InviteOutput, toInviteOutput } from '../dto/invite.output';
import { findAccessibleGroupOrFail } from '../group-access.policy';

export type ListGroupInvitesInput = { actor: Actor; groupId: string };
export type ListGroupInvitesOutput = InviteOutput[];

export class ListGroupInvitesUseCase {
  constructor(
    private readonly groups: GroupRepository,
    private readonly invites: GroupInviteRepository,
  ) {}

  async execute(input: ListGroupInvitesInput): Promise<ListGroupInvitesOutput> {
    const groupId = UniqueEntityId.create(input.groupId);
    await findAccessibleGroupOrFail(this.groups, groupId, input.actor);
    return (await this.invites.listPendingForGroup(groupId)).map(toInviteOutput);
  }
}
