import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findGroupOrFail } from '../find-group-or-fail';

export type RemoveExpenseInput = { groupId: string; expenseId: string };
export type RemoveExpenseOutput = GroupDetailOutput;

export class RemoveExpenseUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: RemoveExpenseInput): Promise<RemoveExpenseOutput> {
    const groupId = UniqueEntityId.create(input.groupId);
    const expenseId = UniqueEntityId.create(input.expenseId);
    const group = await findGroupOrFail(this.repo, groupId);
    group.removeExpense(expenseId);
    await this.repo.save(group);
    return toGroupDetailOutput(group);
  }
}
