import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Person } from '../domain/person.entity';
import {
  PersonDetail,
  PersonGroupInfo,
  PersonRepository,
  PersonSummary,
} from '../domain/person.repository';

export class InMemoryPersonRepository implements PersonRepository {
  private readonly items = new Map<string, Person>();
  private readonly memberships = new Map<string, PersonGroupInfo[]>();

  /** Auxiliar de testes: registra que a pessoa participa de um rolê. */
  link(personId: UniqueEntityId, group: PersonGroupInfo): void {
    this.memberships.set(personId.value, [...(this.memberships.get(personId.value) ?? []), group]);
  }

  async findById(id: UniqueEntityId): Promise<Person | null> {
    return this.items.get(id.value) ?? null;
  }

  async findByNameKey(key: string): Promise<Person | null> {
    return [...this.items.values()].find((p) => p.name.key === key) ?? null;
  }

  async save(person: Person): Promise<void> {
    this.items.set(person.id.value, person);
  }

  async delete(id: UniqueEntityId): Promise<boolean> {
    this.memberships.delete(id.value);
    return this.items.delete(id.value);
  }

  async countMemberships(id: UniqueEntityId): Promise<number> {
    return this.memberships.get(id.value)?.length ?? 0;
  }

  async count(): Promise<number> {
    return this.items.size;
  }

  async listSummaries(): Promise<PersonSummary[]> {
    return [...this.items.values()].map((person) => ({
      person,
      groupCount: this.memberships.get(person.id.value)?.length ?? 0,
    }));
  }

  async getDetail(id: UniqueEntityId): Promise<PersonDetail | null> {
    const person = this.items.get(id.value);
    return person ? { person, groups: this.memberships.get(id.value) ?? [] } : null;
  }
}
