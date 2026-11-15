import { GroupInviteView } from '../../domain/group-invite.repository';

export type InviteOutput = {
  id: string;
  groupId: string;
  invitee: { id: string; username: string; name: string };
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
};

export function toInviteOutput(v: GroupInviteView): InviteOutput {
  return {
    id: v.invite.id.value,
    groupId: v.invite.groupId.value,
    invitee: v.invitee,
    status: v.invite.status,
    createdAt: v.invite.createdAt.toISOString(),
  };
}
