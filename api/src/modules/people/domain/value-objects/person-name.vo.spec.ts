import { PersonName } from './person-name.vo';

describe('PersonName', () => {
  it('aceita 1..40 com trim', () => {
    expect(PersonName.create(' Ana ').value).toBe('Ana');
    expect(PersonName.create('a'.repeat(40)).value).toHaveLength(40);
  });

  it('rejeita vazio, >40 e não-string', () => {
    expect(() => PersonName.create('')).toThrow('Nome da pessoa deve ter entre 1 e 40 caracteres');
    expect(() => PersonName.create('a'.repeat(41))).toThrow('Nome da pessoa');
    expect(() => PersonName.create(undefined)).toThrow('Nome da pessoa é obrigatório');
  });

  it('key = trim + minúsculas pt-BR', () => {
    expect(PersonName.create(' Ána ').key).toBe('ána');
  });

  it('equalsIgnoreCase usa pt-BR', () => {
    expect(PersonName.create('ÁNA').equalsIgnoreCase(PersonName.create('ána'))).toBe(true);
    expect(PersonName.create('Ana').equalsIgnoreCase(PersonName.create('Bia'))).toBe(false);
  });
});
