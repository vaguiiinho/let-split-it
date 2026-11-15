import type { Actor } from '../../../../shared/domain/actor';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';
import { SettlementOutput, toSettlementOutput } from '../dto/settlement.output';
import { findAccessibleGroupOrFail } from '../group-access.policy';

export type GetSettlementInput = { actor: Actor; groupId: string };
export type GetSettlementOutput = SettlementOutput;

export class GetSettlementUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: GetSettlementInput): Promise<GetSettlementOutput> {
    const group = await findAccessibleGroupOrFail(this.repo, UniqueEntityId.create(input.groupId), input.actor);
    return toSettlementOutput(group);
  }
}
