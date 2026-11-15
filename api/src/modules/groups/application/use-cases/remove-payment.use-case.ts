import type { Actor } from '../../../../shared/domain/actor';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findAccessibleGroupOrFail } from '../group-access.policy';

export type RemovePaymentInput = { actor: Actor; groupId: string; paymentId: string };
export type RemovePaymentOutput = GroupDetailOutput;

export class RemovePaymentUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: RemovePaymentInput): Promise<RemovePaymentOutput> {
    const groupId = UniqueEntityId.create(input.groupId);
    const paymentId = UniqueEntityId.create(input.paymentId);
    const group = await findAccessibleGroupOrFail(this.repo, groupId, input.actor);
    group.removePayment(paymentId);
    await this.repo.save(group);
    return toGroupDetailOutput(group);
  }
}
