import { AmountCents } from './amount-cents.vo';

describe('AmountCents', () => {
  const msg = 'Valor deve ser um inteiro de centavos entre 1 e 100000000';

  it('aceita os limites', () => {
    expect(AmountCents.create(1).value).toBe(1);
    expect(AmountCents.create(100_000_000).value).toBe(100_000_000);
  });

  it('rejeita 0, máx+1, decimais e não-número', () => {
    for (const bad of [0, 100_000_001, 10.5, -1, NaN, '10', undefined]) {
      expect(() => AmountCents.create(bad)).toThrow(msg);
    }
  });
});
