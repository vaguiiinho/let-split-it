import type { Actor } from '../../../../shared/domain/actor';
import { GroupRepository, GroupSummary } from '../../domain/group.repository';
import { scopeFor } from '../group-access.policy';

export type ListGroupsInput = { actor: Actor };
export type GroupSummaryOutput = Omit<GroupSummary, 'createdAt'> & { createdAt: string };
export type ListGroupsOutput = GroupSummaryOutput[];

export class ListGroupsUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: ListGroupsInput): Promise<ListGroupsOutput> {
    const list = await this.repo.listSummaries(scopeFor(input.actor));
    return [...list]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));
  }
}
