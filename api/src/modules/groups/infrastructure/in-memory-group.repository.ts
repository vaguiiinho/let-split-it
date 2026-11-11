import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Group } from '../domain/group.aggregate';
import { GroupRepository, GroupSummary } from '../domain/group.repository';

export class InMemoryGroupRepository implements GroupRepository {
  private readonly items = new Map<string, Group>();

  async findById(id: UniqueEntityId): Promise<Group | null> {
    return this.items.get(id.value) ?? null;
  }

  async findAll(): Promise<Group[]> {
    return [...this.items.values()];
  }

  async listSummaries(): Promise<GroupSummary[]> {
    return [...this.items.values()].map((g) => ({
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
