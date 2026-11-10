import { GroupRepository, GroupSummary } from '../../domain/group.repository';

export type ListGroupsInput = Record<string, never>;
export type GroupSummaryOutput = Omit<GroupSummary, 'createdAt'> & { createdAt: string };
export type ListGroupsOutput = GroupSummaryOutput[];

export class ListGroupsUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(_input: ListGroupsInput = {}): Promise<ListGroupsOutput> {
    const list = await this.repo.listSummaries();
    return [...list]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));
  }
}
