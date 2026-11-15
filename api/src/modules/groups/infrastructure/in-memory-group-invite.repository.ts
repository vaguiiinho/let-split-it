import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { InMemoryGroupRepository } from './in-memory-group.repository';
import { InMemoryUserRepository } from '../../users/infrastructure/in-memory-user.repository';
import { GroupInvite } from '../domain/entities/group-invite.entity';
import {
  GroupInviteRepository,
  GroupInviteView,
  PendingInviteView,
} from '../domain/group-invite.repository';

export class InMemoryGroupInviteRepository implements GroupInviteRepository {
  private readonly items = new Map<string, GroupInvite>();

  constructor(
    private readonly users: InMemoryUserRepository,
    private readonly groups: InMemoryGroupRepository,
  ) {}

  async findById(id: UniqueEntityId): Promise<GroupInvite | null> {
    return this.items.get(id.value) ?? null;
  }

  async findPending(groupId: UniqueEntityId, inviteeId: UniqueEntityId): Promise<GroupInvite | null> {
    return (
      [...this.items.values()].find(
        (i) => i.isPending && i.groupId.equals(groupId) && i.inviteeId.equals(inviteeId),
      ) ?? null
    );
  }

  private pending(): GroupInvite[] {
    return [...this.items.values()]
      .filter((i) => i.isPending)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listPendingForInvitee(inviteeId: UniqueEntityId): Promise<PendingInviteView[]> {
    const out: PendingInviteView[] = [];
    for (const i of this.pending().filter((p) => p.inviteeId.equals(inviteeId))) {
      const group = await this.groups.findById(i.groupId);
      const inviter = await this.users.findWithNameById(i.inviterId);
      if (!group || !inviter) continue;
      out.push({
        id: i.id.value,
        group: { id: group.id.value, name: group.name.value },
        inviter: { id: inviter.user.id.value, username: inviter.user.username.value, name: inviter.name },
        createdAt: i.createdAt,
      });
    }
    return out;
  }

  async listPendingForGroup(groupId: UniqueEntityId): Promise<GroupInviteView[]> {
    const out: GroupInviteView[] = [];
    for (const i of this.pending().filter((p) => p.groupId.equals(groupId))) {
      const invitee = await this.users.findWithNameById(i.inviteeId);
      if (!invitee) continue;
      out.push({
        invite: i,
        invitee: { id: invitee.user.id.value, username: invitee.user.username.value, name: invitee.name },
      });
    }
    return out;
  }

  async countPendingForInvitee(inviteeId: UniqueEntityId): Promise<number> {
    return this.pending().filter((p) => p.inviteeId.equals(inviteeId)).length;
  }

  async save(invite: GroupInvite): Promise<void> {
    this.items.set(invite.id.value, invite);
  }
}
