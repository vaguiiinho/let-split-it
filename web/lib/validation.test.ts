import { describe, expect, it } from 'vitest';
import { createUserSchema, inviteSchema, loginSchema, userSearchSchema } from './validation';

const msg = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues[0]?.message;

describe('loginSchema', () => {
  it('faz trim do username e mantém a senha como veio', () => {
    const r = loginSchema.safeParse({ username: '  huguinho ', password: ' segredo ' });
    expect(r.success && r.data).toEqual({ username: 'huguinho', password: ' segredo ' });
  });

  it.each(['', '   '])('rejeita username %j', (username) => {
    expect(msg(loginSchema.safeParse({ username, password: 'x' }))).toBe('Informe o usuário');
  });

  it('rejeita senha vazia', () => {
    expect(msg(loginSchema.safeParse({ username: 'ana', password: '' }))).toBe('Informe a senha');
  });
});

describe('createUserSchema', () => {
  const base = { username: 'ana.souza', password: '12345678', name: '', role: 'USER' };

  it('normaliza username e trata nome vazio como ausente', () => {
    const r = createUserSchema.safeParse({ ...base, username: '  Ana.Souza ' });
    expect(r.success && r.data).toEqual({ username: 'ana.souza', password: '12345678', name: undefined, role: 'USER' });
  });

  it('rejeita username curto', () => {
    expect(msg(createUserSchema.safeParse({ ...base, username: 'ab' }))).toBe('Usuário deve ter entre 3 e 30 caracteres');
  });

  it('rejeita username com acento', () => {
    expect(msg(createUserSchema.safeParse({ ...base, username: 'joão' }))).toBe(
      'Usuário deve conter apenas letras sem acento, números, ponto, hífen ou sublinhado',
    );
  });

  it('rejeita senha de 7 caracteres', () => {
    expect(msg(createUserSchema.safeParse({ ...base, password: '1234567' }))).toBe('Senha deve ter entre 8 e 128 caracteres');
  });

  it('rejeita papel desconhecido', () => {
    expect(createUserSchema.safeParse({ ...base, role: 'ROOT' }).success).toBe(false);
  });
});

describe('inviteSchema / userSearchSchema', () => {
  it('exige uuids', () => {
    expect(inviteSchema.safeParse({ groupId: 'x', userId: 'y' }).success).toBe(false);
    expect(
      inviteSchema.safeParse({
        groupId: '3f1c2b9e-8a4d-4c7e-9b2a-1d5e6f7a8b9c',
        userId: '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d',
      }).success,
    ).toBe(true);
  });

  it('busca precisa de 2 a 30 caracteres', () => {
    expect(msg(userSearchSchema.safeParse(' a '))).toBe('Informe de 2 a 30 caracteres para buscar');
    expect(userSearchSchema.safeParse('luiz').success).toBe(true);
  });
});
