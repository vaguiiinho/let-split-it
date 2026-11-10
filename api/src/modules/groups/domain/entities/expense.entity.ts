import { ValidationError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { splitByWeights } from '../services/split.service';
import { AmountCents } from '../value-objects/amount-cents.vo';
import { ExpenseDescription } from '../value-objects/expense-description.vo';
import { Weight } from '../value-objects/weight.vo';

export interface ExpenseParticipant {
  memberId: UniqueEntityId;
  weight: Weight;
}

export interface ExpenseShare {
  memberId: UniqueEntityId;
  weight: number;
  shareCents: number;
}

export interface ExpenseProps {
  description: ExpenseDescription;
  amount: AmountCents;
  payerId: UniqueEntityId;
  participants: readonly ExpenseParticipant[];
  createdAt: Date;
}

export class Expense {
  private constructor(
    readonly id: UniqueEntityId,
    readonly description: ExpenseDescription,
    readonly amount: AmountCents,
    readonly payerId: UniqueEntityId,
    readonly participants: readonly ExpenseParticipant[],
    readonly createdAt: Date,
  ) {}

  static create(props: ExpenseProps, id?: UniqueEntityId): Expense {
    if (props.participants.length < 1) {
      throw new ValidationError('A despesa precisa de ao menos um participante');
    }
    return Expense.restore({ ...props, id: id ?? UniqueEntityId.create() });
  }

  static restore(props: ExpenseProps & { id: UniqueEntityId }): Expense {
    return new Expense(
      props.id,
      props.description,
      props.amount,
      props.payerId,
      [...props.participants],
      props.createdAt,
    );
  }

  /** Quanto cada participante deve (maior resto, soma exata). */
  shares(): ExpenseShare[] {
    const parts = splitByWeights(
      this.amount.value,
      this.participants.map((p) => p.weight.value),
    );
    return this.participants.map((p, i) => ({
      memberId: p.memberId,
      weight: p.weight.value,
      shareCents: parts[i],
    }));
  }
}
