import { Money } from './money.vo';

describe('Money', () => {
  it('formata e soma', () => {
    expect(Money.fromCents(1234).toDecimalString()).toBe('12.34');
    expect(Money.fromCents(5).toDecimalString()).toBe('0.05');
    expect(Money.fromCents(1).add(Money.fromCents(2)).cents).toBe(3);
    expect(Money.zero().isZero()).toBe(true);
  });

  it('rejeita negativo e não inteiro', () => {
    expect(() => Money.fromCents(-1)).toThrow();
    expect(() => Money.fromCents(1.5)).toThrow();
  });
});
