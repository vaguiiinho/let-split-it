import { GroupInvite as InviteRow } from '@prisma/client';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupInvite } from '../domain/entities/group-invite.entity';

export function toDomain(row: InviteRow): GroupInvite {
  return GroupInvite.restore({
    id: UniqueEntityId.create(row.id),
    groupId: UniqueEntityId.create(row.groupId),
    inviterId: UniqueEntityId.create(row.inviterId),
    inviteeId: UniqueEntityId.create(row.inviteeId),
    status: row.status,
    createdAt: row.createdAt,
    respondedAt: row.respondedAt,
  });
}

export function toPersistence(invite: GroupInvite) {
  return {
    id: invite.id.value,
    groupId: invite.groupId.value,
    inviterId: invite.inviterId.value,
    inviteeId: invite.inviteeId.value,
    status: invite.status,
    createdAt: invite.createdAt,
    respondedAt: invite.respondedAt,
  };
}
