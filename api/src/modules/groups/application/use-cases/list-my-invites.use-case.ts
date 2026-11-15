import type { Actor } from '../../../../shared/domain/actor';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupInviteRepository } from '../../domain/group-invite.repository';

export type ListMyInvitesInput = { actor: Actor };
export type ListMyInvitesOutput = {
  id: string;
  group: { id: string; name: string };
  inviter: { id: string; username: string; name: string };
  createdAt: string;
}[];

export class ListMyInvitesUseCase {
  constructor(private readonly invites: GroupInviteRepository) {}

  async execute(input: ListMyInvitesInput): Promise<ListMyInvitesOutput> {
    const list = await this.invites.listPendingForInvitee(UniqueEntityId.create(input.actor.userId));
    return list.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }));
  }
}
