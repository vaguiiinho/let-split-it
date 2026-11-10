import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';
import { SettlementOutput, toSettlementOutput } from '../dto/settlement.output';
import { findGroupOrFail } from '../find-group-or-fail';

export type GetSettlementInput = { groupId: string };
export type GetSettlementOutput = SettlementOutput;

export class GetSettlementUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: GetSettlementInput): Promise<GetSettlementOutput> {
    const group = await findGroupOrFail(this.repo, UniqueEntityId.create(input.groupId));
    return toSettlementOutput(group);
  }
}
