import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupInvite } from './entities/group-invite.entity';

/** Convite pendente recebido, com os dados de exibição (C4). */
export interface PendingInviteView {
  id: string;
  group: { id: string; name: string };
  inviter: { id: string; username: string; name: string };
  createdAt: Date;
}

/** Convite pendente de um rolê, com o convidado (C8). */
export interface GroupInviteView {
  invite: GroupInvite;
  invitee: { id: string; username: string; name: string };
}

export interface GroupInviteRepository {
  findById(id: UniqueEntityId): Promise<GroupInvite | null>;
  findPending(groupId: UniqueEntityId, inviteeId: UniqueEntityId): Promise<GroupInvite | null>;
  /** createdAt desc. */
  listPendingForInvitee(inviteeId: UniqueEntityId): Promise<PendingInviteView[]>;
  /** createdAt desc. */
  listPendingForGroup(groupId: UniqueEntityId): Promise<GroupInviteView[]>;
  countPendingForInvitee(inviteeId: UniqueEntityId): Promise<number>;
  save(invite: GroupInvite): Promise<void>;
}

export const GROUP_INVITE_REPOSITORY = Symbol('GROUP_INVITE_REPOSITORY');
