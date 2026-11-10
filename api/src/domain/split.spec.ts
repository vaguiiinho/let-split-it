import { splitByWeights } from './split';
import { ValidationError } from './errors';

describe('splitByWeights', () => {
  it('divide igualmente quando exato', () => {
    expect(splitByWeights(9000, [1, 1, 1])).toEqual([3000, 3000, 3000]);
  });

  it('soma sempre exatamente o valor (maior resto, desempate pela ordem)', () => {
    expect(splitByWeights(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(splitByWeights(1, [1, 1, 1])).toEqual([1, 0, 0]);
    expect(splitByWeights(200, [1, 1, 1])).toEqual([67, 67, 66]);
  });

  it('respeita pesos', () => {
    expect(splitByWeights(1000, [1, 3])).toEqual([250, 750]);
    // 1000*2/7=285.71, 1000*5/7=714.28 → resto maior para o primeiro
    expect(splitByWeights(1000, [2, 5])).toEqual([286, 714]);
  });

  it('distribui centavos aos de maior resto, não por ordem', () => {
    // 10 * [1,2,2]/5 = [2,4,4] exato; 11 → [2.2, 4.4, 4.4] → +1 no segundo
    expect(splitByWeights(11, [1, 2, 2])).toEqual([2, 5, 4]);
  });

  it('propriedade: Σ shares == amount para entradas variadas', () => {
    for (let amount = 1; amount < 500; amount += 7) {
      for (const weights of [[1], [1, 2], [3, 3, 3], [1, 100, 7, 13], [5, 1, 1, 1, 1, 1, 1]]) {
        const shares = splitByWeights(amount, weights);
        expect(shares.reduce((a, b) => a + b, 0)).toBe(amount);
        expect(shares.every((s) => Number.isInteger(s) && s >= 0)).toBe(true);
      }
    }
  });

  it('rejeita entradas inválidas', () => {
    expect(() => splitByWeights(100, [])).toThrow(ValidationError);
    expect(() => splitByWeights(100, [0, 1])).toThrow(ValidationError);
    expect(() => splitByWeights(1.5, [1])).toThrow(ValidationError);
  });
});
