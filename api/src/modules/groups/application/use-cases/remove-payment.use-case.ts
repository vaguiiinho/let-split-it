import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findGroupOrFail } from '../find-group-or-fail';

export type RemovePaymentInput = { groupId: string; paymentId: string };
export type RemovePaymentOutput = GroupDetailOutput;

export class RemovePaymentUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: RemovePaymentInput): Promise<RemovePaymentOutput> {
    const groupId = UniqueEntityId.create(input.groupId);
    const paymentId = UniqueEntityId.create(input.paymentId);
    const group = await findGroupOrFail(this.repo, groupId);
    group.removePayment(paymentId);
    await this.repo.save(group);
    return toGroupDetailOutput(group);
  }
}
