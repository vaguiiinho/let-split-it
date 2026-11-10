import { NotFoundError } from '../domain/errors';
import { Group } from '../domain/group';
import { Clock, GroupRepository, GroupSummary, IdGenerator } from './ports';
import { GroupDetailView, SettlementView, toGroupDetail, toSettlement } from './views';

export interface AddMemberCommand {
  name: string;
  pixKey?: string | null;
}

export interface AddExpenseCommand {
  description: string;
  amountCents: number;
  payerId: string;
  participants: { memberId: string; weight?: number }[];
}

export interface GroupSummaryView extends Omit<GroupSummary, 'createdAt'> {
  createdAt: string;
}

/** Casos de uso do rolê. Puro TS: depende apenas de portas e do domínio. */
export class GroupUseCases {
  constructor(
    private readonly repo: GroupRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  private async load(id: string): Promise<Group> {
    const group = await this.repo.findById(id);
    if (!group) throw new NotFoundError('Rolê não encontrado');
    return group;
  }

  async createGroup(name: string): Promise<GroupDetailView> {
    const group = Group.create(this.ids.next(), name, this.clock.now());
    await this.repo.save(group);
    return toGroupDetail(group);
  }

  async listGroups(): Promise<GroupSummaryView[]> {
    const list = await this.repo.listSummaries();
    return list
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));
  }

  async getGroup(id: string): Promise<GroupDetailView> {
    return toGroupDetail(await this.load(id));
  }

  async deleteGroup(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError('Rolê não encontrado');
  }

  async addMember(groupId: string, cmd: AddMemberCommand): Promise<GroupDetailView> {
    const group = await this.load(groupId);
    group.addMember(this.ids.next(), cmd.name, cmd.pixKey);
    await this.repo.save(group);
    return toGroupDetail(group);
  }

  async removeMember(groupId: string, memberId: string): Promise<GroupDetailView> {
    const group = await this.load(groupId);
    group.removeMember(memberId);
    await this.repo.save(group);
    return toGroupDetail(group);
  }

  async addExpense(groupId: string, cmd: AddExpenseCommand): Promise<GroupDetailView> {
    const group = await this.load(groupId);
    group.addExpense({ ...cmd, id: this.ids.next(), createdAt: this.clock.now() });
    await this.repo.save(group);
    return toGroupDetail(group);
  }

  async removeExpense(groupId: string, expenseId: string): Promise<GroupDetailView> {
    const group = await this.load(groupId);
    group.removeExpense(expenseId);
    await this.repo.save(group);
    return toGroupDetail(group);
  }

  async getSettlement(groupId: string): Promise<SettlementView> {
    return toSettlement(await this.load(groupId));
  }
}
