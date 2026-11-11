import { Clock } from '../../../../shared/domain/clock.port';
import { ConflictError, NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { Person } from '../../../people/domain/person.entity';
import { PersonRepository } from '../../../people/domain/person.repository';
import { PersonName } from '../../../people/domain/value-objects/person-name.vo';
import { PixKey } from '../../../people/domain/value-objects/pix-key.vo';
import { GroupRepository } from '../../domain/group.repository';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findGroupOrFail } from '../find-group-or-fail';

export type AddMemberInput = {
  groupId: string;
  personId?: string;
  name?: string;
  pixKey?: string | null;
};
export type AddMemberOutput = GroupDetailOutput;

type Target = { personId: UniqueEntityId } | { name: PersonName; pixKey: PixKey | null };

export class AddMemberUseCase {
  constructor(
    private readonly repo: GroupRepository,
    private readonly people: PersonRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: AddMemberInput): Promise<AddMemberOutput> {
    const groupId = UniqueEntityId.create(input.groupId);
    const target = this.parseTarget(input);
    const group = await findGroupOrFail(this.repo, groupId);
    const person = await this.resolvePerson(target);
    group.addMember(person);
    await this.repo.save(group);
    return toGroupDetailOutput(group);
  }

  private parseTarget(input: AddMemberInput): Target {
    const hasId = input.personId !== undefined && input.personId !== null;
    const hasName = input.name !== undefined && input.name !== null;
    if (hasId === hasName) {
      throw new ValidationError('Informe uma pessoa existente ou o nome de uma nova pessoa');
    }
    if (hasId) {
      if (typeof input.pixKey === 'string' && input.pixKey.trim() !== '') {
        throw new ValidationError('Chave PIX só pode ser informada ao criar uma nova pessoa');
      }
      return { personId: UniqueEntityId.create(input.personId) };
    }
    return { name: PersonName.create(input.name), pixKey: PixKey.createOptional(input.pixKey) };
  }

  private async resolvePerson(target: Target): Promise<Person> {
    if ('personId' in target) {
      const person = await this.people.findById(target.personId);
      if (!person) throw new NotFoundError('Pessoa não encontrada');
      return person;
    }
    const existing = await this.people.findByNameKey(target.name.key);
    if (existing) {
      if (target.pixKey && target.pixKey.value !== existing.pixKey?.value) {
        throw new ConflictError(
          `Já existe uma pessoa chamada "${existing.name.value}" com outra chave PIX. Selecione-a na lista ou edite a pessoa`,
        );
      }
      return existing;
    }
    const person = Person.create(
      { name: target.name, pixKey: target.pixKey },
      this.clock.now(),
    );
    await this.people.save(person);
    return person;
  }
}
