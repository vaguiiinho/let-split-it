import { MemberName } from './member-name.vo';

describe('MemberName', () => {
  it('aceita 1..40 com trim', () => {
    expect(MemberName.create(' Ana ').value).toBe('Ana');
    expect(MemberName.create('a'.repeat(40)).value).toHaveLength(40);
  });

  it('rejeita vazio, >40 e não-string', () => {
    expect(() => MemberName.create('')).toThrow('Nome da pessoa deve ter entre 1 e 40 caracteres');
    expect(() => MemberName.create('a'.repeat(41))).toThrow('Nome da pessoa');
    expect(() => MemberName.create(undefined)).toThrow('Nome da pessoa é obrigatório');
  });

  it('equalsIgnoreCase usa pt-BR', () => {
    expect(MemberName.create('ÁNA').equalsIgnoreCase(MemberName.create('ána'))).toBe(true);
    expect(MemberName.create('Ana').equalsIgnoreCase(MemberName.create('Bia'))).toBe(false);
  });
});
