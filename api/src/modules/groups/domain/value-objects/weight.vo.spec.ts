import { Weight } from './weight.vo';

describe('Weight', () => {
  it('undefined → 1 e aceita limites', () => {
    expect(Weight.create().value).toBe(1);
    expect(Weight.create(1).value).toBe(1);
    expect(Weight.create(100).value).toBe(100);
  });

  it('rejeita 0, 101, decimais e não-número', () => {
    for (const bad of [0, 101, 1.5, '2', null]) {
      expect(() => Weight.create(bad)).toThrow('Peso deve ser inteiro entre 1 e 100');
    }
  });
});
