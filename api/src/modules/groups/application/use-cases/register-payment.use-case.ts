import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { Clock } from '../../domain/clock.port';
import { GroupRepository } from '../../domain/group.repository';
import { AmountCents } from '../../domain/value-objects/amount-cents.vo';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';
import { findGroupOrFail } from '../find-group-or-fail';

export type RegisterPaymentInput = {
  groupId: string;
  fromId: string;
  toId: string;
  amountCents: number;
};
export type RegisterPaymentOutput = GroupDetailOutput;

export class RegisterPaymentUseCase {
  constructor(
    private readonly repo: GroupRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: RegisterPaymentInput): Promise<RegisterPaymentOutput> {
    const groupId = UniqueEntityId.create(input.groupId);
    const fromId = UniqueEntityId.create(input.fromId);
    const toId = UniqueEntityId.create(input.toId);
    const amount = AmountCents.create(input.amountCents);
    const group = await findGroupOrFail(this.repo, groupId);
    group.registerPayment(fromId, toId, amount, this.clock.now());
    await this.repo.save(group);
    return toGroupDetailOutput(group);
  }
}
