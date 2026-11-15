import type { Actor } from '../../../../shared/domain/actor';
import { Clock } from '../../../../shared/domain/clock.port';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { PersonRepository } from '../../../people/domain/person.repository';
import { GroupInvite } from '../../domain/entities/group-invite.entity';
import { GroupInviteRepository } from '../../domain/group-invite.repository';
import { GroupRepository } from '../../domain/group.repository';

export type AcceptInviteInput = { actor: Actor; inviteId: string };
export type AcceptInviteOutput = { groupId: string };

/** C5: convite inexistente ou de outro usuário → 404. */
export async function findOwnInviteOrFail(
  invites: GroupInviteRepository,
  id: UniqueEntityId,
  actor: Actor,
): Promise<GroupInvite> {
  const invite = await invites.findById(id);
  if (!invite || invite.inviteeId.value !== actor.userId) {
    throw new NotFoundError('Convite não encontrado');
  }
  return invite;
}

export class AcceptInviteUseCase {
  constructor(
    private readonly groups: GroupRepository,
    private readonly invites: GroupInviteRepository,
    private readonly people: PersonRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: AcceptInviteInput): Promise<AcceptInviteOutput> {
    const inviteId = UniqueEntityId.create(input.inviteId);
    const invite = await findOwnInviteOrFail(this.invites, inviteId, input.actor);
    if (!invite.isPending) throw new ConflictError('Este convite já foi respondido');
    const group = await this.groups.findById(invite.groupId);
    if (!group) throw new NotFoundError('Convite não encontrado');
    const personId = UniqueEntityId.create(input.actor.personId);
    if (!group.hasMember(personId)) {
      const person = await this.people.findById(personId);
      if (!person) throw new NotFoundError('Pessoa não encontrada');
      group.addMember(person);
      await this.groups.save(group);
    }
    // C6: grupo primeiro, convite depois (repetir após falha entre os saves é seguro).
    invite.accept(this.clock.now());
    await this.invites.save(invite);
    return { groupId: group.id.value };
  }
}
