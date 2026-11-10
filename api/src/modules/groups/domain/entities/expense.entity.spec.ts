import { ValidationError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { AmountCents } from '../value-objects/amount-cents.vo';
import { ExpenseDescription } from '../value-objects/expense-description.vo';
import { Weight } from '../value-objects/weight.vo';
import { Expense } from './expense.entity';

describe('Expense', () => {
  const a = UniqueEntityId.create();
  const b = UniqueEntityId.create();
  const base = {
    description: ExpenseDescription.create('Gelo'),
    amount: AmountCents.create(100),
    payerId: a,
    createdAt: new Date(),
  };

  it('shares divide por pesos com soma exata', () => {
    const e = Expense.create({
      ...base,
      participants: [
        { memberId: a, weight: Weight.create(2) },
        { memberId: b, weight: Weight.create() },
      ],
    });
    expect(e.shares().map((s) => s.shareCents)).toEqual([67, 33]);
    expect(e.shares()[0]).toMatchObject({ weight: 2 });
  });

  it('exige ao menos um participante', () => {
    expect(() => Expense.create({ ...base, participants: [] })).toThrow(ValidationError);
  });

  it('restore preserva id', () => {
    const id = UniqueEntityId.create();
    const e = Expense.restore({ ...base, id, participants: [{ memberId: a, weight: Weight.create() }] });
    expect(e.id.equals(id)).toBe(true);
  });
});
