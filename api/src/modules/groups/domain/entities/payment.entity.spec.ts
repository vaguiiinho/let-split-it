import { ValidationError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { AmountCents } from '../value-objects/amount-cents.vo';
import { Payment } from './payment.entity';

describe('Payment', () => {
  const a = UniqueEntityId.create();
  const b = UniqueEntityId.create();
  const amount = AmountCents.create(500);

  it('create e involves', () => {
    const p = Payment.create({ fromId: a, toId: b, amount, createdAt: new Date() });
    expect(p.involves(a)).toBe(true);
    expect(p.involves(b)).toBe(true);
    expect(p.involves(UniqueEntityId.create())).toBe(false);
  });

  it('rejeita from == to', () => {
    expect(() => Payment.create({ fromId: a, toId: a, amount, createdAt: new Date() })).toThrow(
      new ValidationError('Quem paga e quem recebe precisam ser pessoas diferentes'),
    );
  });

  it('restore preserva id', () => {
    const id = UniqueEntityId.create();
    expect(Payment.restore({ id, fromId: a, toId: b, amount, createdAt: new Date() }).id.equals(id)).toBe(true);
  });
});
