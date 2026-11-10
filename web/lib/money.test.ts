import { describe, expect, it } from 'vitest';
import { formatBRL, parseMoneyToCents } from './money';

const norm = (s: string) => s.replace(/ /g, ' ');

describe('parseMoneyToCents', () => {
  it.each([
    ['12,34', 1234],
    ['1.234,56', 123456],
    ['12.5', 1250],
    ['R$ 10', 1000],
    ['r$10,5', 1050],
    ['  7  ', 700],
    ['0,99', 99],
    ['1.234', 123400],
    ['1.234.567,89', 123456789],
    ['1,234.56', 123456],
    ['10,', 1000],
    [',5', 50],
    ['0', 0],
  ])('%s → %s', (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '-5', '12,345', '1.2.3', '1,2,3', '12,3,4', 'R$', '1.23,45', '12..5', '1e3', '.', ','])(
    'rejeita %j',
    (input) => {
      expect(parseMoneyToCents(input)).toBeNull();
    },
  );
});

describe('formatBRL', () => {
  it('formata centavos em reais pt-BR', () => {
    expect(norm(formatBRL(123456))).toBe('R$ 1.234,56');
    expect(norm(formatBRL(0))).toBe('R$ 0,00');
    expect(norm(formatBRL(5))).toBe('R$ 0,05');
  });

  it('é o inverso de parseMoneyToCents', () => {
    expect(parseMoneyToCents(formatBRL(98765))).toBe(98765);
  });
});
