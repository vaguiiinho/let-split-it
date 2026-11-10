import { ValidationError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { AmountCents } from '../value-objects/amount-cents.vo';

export interface PaymentProps {
  fromId: UniqueEntityId;
  toId: UniqueEntityId;
  amount: AmountCents;
  createdAt: Date;
}

export class Payment {
  private constructor(
    readonly id: UniqueEntityId,
    readonly fromId: UniqueEntityId,
    readonly toId: UniqueEntityId,
    readonly amount: AmountCents,
    readonly createdAt: Date,
  ) {}

  static create(props: PaymentProps, id?: UniqueEntityId): Payment {
    if (props.fromId.equals(props.toId)) {
      throw new ValidationError('Quem paga e quem recebe precisam ser pessoas diferentes');
    }
    return Payment.restore({ ...props, id: id ?? UniqueEntityId.create() });
  }

  static restore(props: PaymentProps & { id: UniqueEntityId }): Payment {
    return new Payment(props.id, props.fromId, props.toId, props.amount, props.createdAt);
  }

  involves(memberId: UniqueEntityId): boolean {
    return this.fromId.equals(memberId) || this.toId.equals(memberId);
  }
}
