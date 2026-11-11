import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { Clock } from '../../../../shared/domain/clock.port';
import { GroupRepository } from '../../domain/group.repository';
import { AmountCents } from '../../domain/value-objects/amount-cents.vo';
import { ExpenseDescription } from '../../domain/value-objects/expense-description.vo';
import { Weight } from '../../domain/value-objects/weight.vo';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findGroupOrFail } from '../find-group-or-fail';

export type AddExpenseInput = {
  groupId: string;
  description: string;
  amountCents: number;
  payerId: string;
  participants: { memberId: string; weight?: number }[];
};
export type AddExpenseOutput = GroupDetailOutput;

export class AddExpenseUseCase {
  constructor(
    private readonly repo: GroupRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: AddExpenseInput): Promise<AddExpenseOutput> {
    const groupId = UniqueEntityId.create(input.groupId);
    const description = ExpenseDescription.create(input.description);
    const amount = AmountCents.create(input.amountCents);
    const payerId = UniqueEntityId.create(input.payerId);
    const participants = (input.participants ?? []).map((p) => ({
      memberId: UniqueEntityId.create(p.memberId),
      weight: Weight.create(p.weight),
    }));
    const group = await findGroupOrFail(this.repo, groupId);
    group.addExpense({ description, amount, payerId, participants, createdAt: this.clock.now() });
    await this.repo.save(group);
    return toGroupDetailOutput(group);
  }
}
