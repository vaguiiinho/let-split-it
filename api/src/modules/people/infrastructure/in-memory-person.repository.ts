import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import type { GroupScope } from '../../../shared/domain/group-scope';
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
  private readonly viewers = new Map<string, string[]>();
  private readonly linkedToUser = new Set<string>();

  /**
   * Auxiliar de testes: registra que a pessoa participa de um rolê.
   * `viewers` (ids de usuário/pessoa) restringe quem o enxerga em escopo `user`; sem ele, todos enxergam.
   */
  link(personId: UniqueEntityId, group: PersonGroupInfo, viewers?: string[]): void {
    this.memberships.set(personId.value, [...(this.memberships.get(personId.value) ?? []), group]);
    if (viewers) this.viewers.set(group.id, viewers);
  }

  /** Auxiliar de testes: marca a pessoa como vinculada a um usuário. */
  markLinkedToUser(personId: UniqueEntityId): void {
    this.linkedToUser.add(personId.value);
  }

  private visible(scope: GroupScope, groups: PersonGroupInfo[]): PersonGroupInfo[] {
    if (scope.kind === 'all') return groups;
    return groups.filter((g) => {
      const v = this.viewers.get(g.id);
      return !v || v.includes(scope.userId) || v.includes(scope.personId);
    });
  }

  async isLinkedToUser(id: UniqueEntityId): Promise<boolean> {
    return this.linkedToUser.has(id.value);
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

  async listSummaries(scope: GroupScope = { kind: 'all' }): Promise<PersonSummary[]> {
    return [...this.items.values()].map((person) => ({
      person,
      groupCount: this.visible(scope, this.memberships.get(person.id.value) ?? []).length,
      hasAccount: this.linkedToUser.has(person.id.value),
    }));
  }

  async getDetail(
    id: UniqueEntityId,
    scope: GroupScope = { kind: 'all' },
  ): Promise<PersonDetail | null> {
    const person = this.items.get(id.value);
    return person
      ? {
          person,
          hasAccount: this.linkedToUser.has(id.value),
          groups: this.visible(scope, this.memberships.get(id.value) ?? []) }
      : null;
  }
}
