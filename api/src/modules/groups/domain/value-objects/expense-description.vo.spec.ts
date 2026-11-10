import { ExpenseDescription } from './expense-description.vo';

describe('ExpenseDescription', () => {
  it('aceita 1..80 com trim', () => {
    expect(ExpenseDescription.create(' Carne ').value).toBe('Carne');
    expect(ExpenseDescription.create('a'.repeat(80)).value).toHaveLength(80);
  });

  it('rejeita vazio, >80 e não-string', () => {
    expect(() => ExpenseDescription.create('  ')).toThrow('Descrição deve ter entre 1 e 80 caracteres');
    expect(() => ExpenseDescription.create('a'.repeat(81))).toThrow('Descrição');
    expect(() => ExpenseDescription.create(null)).toThrow('Descrição é obrigatório');
  });
});
