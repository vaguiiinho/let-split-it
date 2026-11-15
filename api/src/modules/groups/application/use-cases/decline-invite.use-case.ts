import type { Actor } from '../../../../shared/domain/actor';
import { Clock } from '../../../../shared/domain/clock.port';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupInviteRepository } from '../../domain/group-invite.repository';
import { findOwnInviteOrFail } from './accept-invite.use-case';

export type DeclineInviteInput = { actor: Actor; inviteId: string };
export type DeclineInviteOutput = void;

export class DeclineInviteUseCase {
  constructor(
    private readonly invites: GroupInviteRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: DeclineInviteInput): Promise<DeclineInviteOutput> {
    const invite = await findOwnInviteOrFail(
      this.invites,
      UniqueEntityId.create(input.inviteId),
      input.actor,
    );
    invite.decline(this.clock.now());
    await this.invites.save(invite);
  }
}
