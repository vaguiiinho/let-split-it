import type { Actor } from '../../../../shared/domain/actor';
import { Clock } from '../../../../shared/domain/clock.port';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { UserRepository } from '../../../users/domain/user.repository';
import { Username } from '../../../users/domain/value-objects/username.vo';
import { GroupInvite } from '../../domain/entities/group-invite.entity';
import { GroupInviteRepository } from '../../domain/group-invite.repository';
import { GroupRepository } from '../../domain/group.repository';
import { InviteOutput, toInviteOutput } from '../dto/invite.output';
import { findAccessibleGroupOrFail } from '../group-access.policy';

export type InviteUserInput = { actor: Actor; groupId: string; userId?: string; username?: string };
export type InviteUserOutput = InviteOutput;

export class InviteUserUseCase {
  constructor(
    private readonly groups: GroupRepository,
    private readonly invites: GroupInviteRepository,
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: InviteUserInput): Promise<InviteUserOutput> {
    const hasId = input.userId !== undefined && input.userId !== null;
    const hasName = input.username !== undefined && input.username !== null;
    if (hasId === hasName) throw new ValidationError('Informe o usuário a convidar');
    const groupId = UniqueEntityId.create(input.groupId);
    const byId = hasId ? UniqueEntityId.create(input.userId) : null;
    const byName = hasId ? null : Username.create(input.username);

    const group = await findAccessibleGroupOrFail(this.groups, groupId, input.actor);

    const invitee = byId
      ? await this.users.findWithNameById(byId)
      : await this.findByUsername(byName!);
    if (!invitee) throw new NotFoundError('Usuário não encontrado');
    const inviteeName = invitee.user.username.value;

    if (invitee.user.id.value === input.actor.userId) {
      throw new ValidationError('Você não pode convidar a si mesmo');
    }
    if (
      group.ownerId?.equals(invitee.user.id) ||
      group.hasMember(invitee.user.personId)
    ) {
      throw new ConflictError(`${inviteeName} já participa deste rolê`);
    }
    if (await this.invites.findPending(groupId, invitee.user.id)) {
      throw new ConflictError(`Já existe um convite pendente para ${inviteeName} neste rolê`);
    }

    const invite = GroupInvite.create(
      {
        groupId,
        inviterId: UniqueEntityId.create(input.actor.userId),
        inviteeId: invitee.user.id,
      },
      this.clock.now(),
    );
    await this.invites.save(invite);
    return toInviteOutput({
      invite,
      invitee: { id: invitee.user.id.value, username: inviteeName, name: invitee.name },
    });
  }

  private async findByUsername(username: Username) {
    const user = await this.users.findByUsername(username);
    return user ? this.users.findWithNameById(user.id) : null;
  }
}
