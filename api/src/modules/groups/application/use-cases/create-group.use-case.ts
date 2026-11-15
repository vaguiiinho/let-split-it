import type { Actor } from '../../../../shared/domain/actor';
import { Clock } from '../../../../shared/domain/clock.port';
import { NotFoundError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { PersonRepository } from '../../../people/domain/person.repository';
import { Group } from '../../domain/group.aggregate';
import { GroupRepository } from '../../domain/group.repository';
import { GroupName } from '../../domain/value-objects/group-name.vo';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';

export type CreateGroupInput = { actor: Actor; name: string };
export type CreateGroupOutput = GroupDetailOutput;

export class CreateGroupUseCase {
  constructor(
    private readonly repo: GroupRepository,
    private readonly people: PersonRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateGroupInput): Promise<CreateGroupOutput> {
    const name = GroupName.create(input.name);
    const personId = UniqueEntityId.create(input.actor.personId);
    const person = await this.people.findById(personId);
    if (!person) throw new NotFoundError('Pessoa não encontrada');
    // R5: o criador é o dono e entra como primeiro membro.
    const group = Group.create(
      { name, ownerId: UniqueEntityId.create(input.actor.userId), ownerPersonId: personId },
      this.clock.now(),
    );
    group.addMember(person);
    await this.repo.save(group);
    return toGroupDetailOutput(group);
  }
}
