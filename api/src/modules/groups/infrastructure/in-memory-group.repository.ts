import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import type { GroupScope } from '../../../shared/domain/group-scope';
import { Group } from '../domain/group.aggregate';
import { GroupRepository, GroupSummary } from '../domain/group.repository';

export class InMemoryGroupRepository implements GroupRepository {
  private readonly items = new Map<string, Group>();

  async findById(id: UniqueEntityId): Promise<Group | null> {
    return this.items.get(id.value) ?? null;
  }

  /** Equivalente a GroupAccessPolicy.canView (R1) / groupVisibleWhere. */
  private visible(scope: GroupScope): Group[] {
    return [...this.items.values()].filter(
      (g) =>
        scope.kind === 'all' ||
        g.ownerId?.value === scope.userId ||
        g.members.some((m) => m.id.value === scope.personId),
    );
  }

  async findAll(scope: GroupScope = { kind: 'all' }): Promise<Group[]> {
    return this.visible(scope);
  }

  async countVisiblePeople(scope: GroupScope = { kind: 'all' }): Promise<number> {
    return new Set(this.visible(scope).flatMap((g) => g.members.map((m) => m.id.value))).size;
  }

  async listSummaries(scope: GroupScope = { kind: 'all' }): Promise<GroupSummary[]> {
    return this.visible(scope).map((g) => ({
      id: g.id.value,
      name: g.name.value,
      createdAt: g.createdAt,
      memberCount: g.members.length,
      expenseCount: g.expenses.length,
      totalCents: g.totalCents,
    }));
  }

  async save(group: Group): Promise<void> {
    this.items.set(group.id.value, group);
  }

  async delete(id: UniqueEntityId): Promise<boolean> {
    return this.items.delete(id.value);
  }
}
