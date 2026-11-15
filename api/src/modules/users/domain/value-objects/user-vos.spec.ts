import { Password } from './password.vo';
import { UserRole } from './user-role.vo';
import { Username } from './username.vo';

describe('Username', () => {
  it('normaliza com trim + lowercase', () => {
    expect(Username.create('  Hugo.Silva ').value).toBe('hugo.silva');
  });

  it('rejeita tamanho, caracteres e não-string com a mensagem exata', () => {
    const size = 'Usuário deve ter entre 3 e 30 caracteres';
    expect(() => Username.create('ab')).toThrow(size);
    expect(() => Username.create('a'.repeat(31))).toThrow(size);
    const chars = 'Usuário deve conter apenas letras sem acento, números, ponto, hífen ou sublinhado';
    expect(() => Username.create('joão')).toThrow(chars);
    expect(() => Username.create('a b')).toThrow(chars);
    expect(() => Username.create(undefined)).toThrow('Usuário é obrigatório');
    expect(Username.create('a'.repeat(30)).value).toHaveLength(30);
  });
});

describe('Password', () => {
  it('8..128 sem trim', () => {
    expect(() => Password.create('1234567')).toThrow('Senha deve ter entre 8 e 128 caracteres');
    expect(() => Password.create('a'.repeat(129))).toThrow('Senha deve ter entre 8 e 128 caracteres');
    expect(Password.create(' 12345678').value).toBe(' 12345678');
    expect(() => Password.create(null)).toThrow('Senha é obrigatória');
  });
});

describe('UserRole', () => {
  it('default USER; ADMIN; inválido', () => {
    expect(UserRole.create(undefined).value).toBe('USER');
    expect(UserRole.create('ADMIN').isAdmin).toBe(true);
    expect(UserRole.create('USER').isAdmin).toBe(false);
    expect(() => UserRole.create('ROOT')).toThrow('Papel inválido');
  });
});
