import type { Actor } from '../../../../shared/domain/actor';
import { Clock } from '../../../../shared/domain/clock.port';
import { ConflictError, NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { Person } from '../../../people/domain/person.entity';
import { PersonRepository } from '../../../people/domain/person.repository';
import { PersonName } from '../../../people/domain/value-objects/person-name.vo';
import { PixKey } from '../../../people/domain/value-objects/pix-key.vo';
import { UserRepository } from '../../../users/domain/user.repository';
import { GroupRepository } from '../../domain/group.repository';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findAccessibleGroupOrFail } from '../group-access.policy';

export type AddMemberInput = {
  actor: Actor;
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
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: AddMemberInput): Promise<AddMemberOutput> {
    const groupId = UniqueEntityId.create(input.groupId);
    const target = this.parseTarget(input);
    const group = await findAccessibleGroupOrFail(this.repo, groupId, input.actor);
    const { person, created } = await this.resolvePerson(target, input.actor);
    try {
      await this.assertNoAccountOrAdmin(person, input.actor);
      group.addMember(person);
      await this.repo.save(group);
    } catch (e) {
      // Person e Group são salvos separadamente: desfaz a pessoa recém-criada para não deixá-la órfã.
      if (created) await this.people.delete(person.id);
      throw e;
    }
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

  private async resolvePerson(
    target: Target,
    actor: Actor,
  ): Promise<{ person: Person; created: boolean }> {
    if ('personId' in target) {
      const person = await this.people.findById(target.personId);
      if (!person) throw new NotFoundError('Pessoa não encontrada');
      return { person, created: false };
    }
    const existing = await this.people.findByNameKey(target.name.key);
    if (existing) {
      if (target.pixKey && target.pixKey.value !== existing.pixKey?.value) {
        throw new ConflictError(
          `Já existe uma pessoa chamada "${existing.name.value}" com outra chave PIX. Selecione-a na lista ou edite a pessoa`,
        );
      }
      return { person: existing, created: false };
    }
    const person = Person.create(
      {
        name: target.name,
        pixKey: target.pixKey,
        createdById: UniqueEntityId.create(actor.userId),
      },
      this.clock.now(),
    );
    await this.people.save(person);
    return { person, created: true };
  }

  /** R7: quem tem conta entra por convite; só o ADMIN adiciona direto. */
  private async assertNoAccountOrAdmin(person: Person, actor: Actor): Promise<void> {
    if (actor.role === 'ADMIN') return;
    if (await this.users.findByPersonId(person.id)) {
      throw new ConflictError(`${person.name.value} tem conta no Racha Aí: envie um convite`);
    }
  }
}
