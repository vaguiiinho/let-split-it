import { z } from 'zod';
import type { ActionResult } from './types';

const idWith = (message: string) => z.string().trim().min(1, message).max(100);
export const idSchema = idWith('Identificador inválido.');

export const groupNameSchema = z
  .string()
  .trim()
  .min(1, 'Dá um nome pro rolê.')
  .max(60, 'Nome do rolê: no máximo 60 caracteres.');

export const updateGroupSchema = z.object({ groupId: idSchema, name: groupNameSchema });

const personNameSchema = z
  .string()
  .trim()
  .min(1, 'Qual o nome da pessoa?')
  .max(40, 'Nome: no máximo 40 caracteres.');

/** Texto da chave PIX; vazio vira `null` (na edição, limpa a chave). */
const pixKeySchema = z
  .string()
  .trim()
  .max(77, 'Chave PIX: no máximo 77 caracteres.')
  .transform((v) => (v === '' ? null : v));

/** Criar/editar pessoa. */
export const personSchema = z.object({ name: personNameSchema, pixKey: pixKeySchema });

/** Adicionar ao rolê uma pessoa já cadastrada. */
export const addExistingMemberSchema = z.object({
  groupId: idSchema,
  personId: idWith('Escolha uma pessoa da lista.'),
});

/** Criar uma pessoa nova (ou reaproveitar pelo nome) direto no rolê. */
export const newMemberSchema = z.object({ groupId: idSchema, name: personNameSchema, pixKey: pixKeySchema });

// ── Autenticação, usuários e convites (spec 004) ──

/** Login: só confere presença; o formato do username é validado (e escondido) pela API (A1). */
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário').max(30, 'Usuário: no máximo 30 caracteres.'),
  password: z.string().min(1, 'Informe a senha').max(128, 'Senha: no máximo 128 caracteres.'),
});

/** Espelha os VOs `Username`/`Password`/`UserRole` da API. */
export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Usuário deve ter entre 3 e 30 caracteres')
    .max(30, 'Usuário deve ter entre 3 e 30 caracteres')
    .regex(/^[a-z0-9._-]+$/, 'Usuário deve conter apenas letras sem acento, números, ponto, hífen ou sublinhado'),
  password: z
    .string()
    .min(8, 'Senha deve ter entre 8 e 128 caracteres')
    .max(128, 'Senha deve ter entre 8 e 128 caracteres'),
  name: z
    .string()
    .trim()
    .max(40, 'Nome: no máximo 40 caracteres.')
    .transform((v) => (v === '' ? undefined : v)),
  role: z.enum(['USER', 'ADMIN'], { error: 'Papel inválido' }),
});

export const inviteSchema = z.object({
  groupId: z.uuid('Identificador inválido.'),
  userId: z.uuid('Escolha um usuário da busca.'),
});

/** Busca de usuários para convite (U6): 2 a 30 caracteres depois do trim. */
export const userSearchSchema = z
  .string()
  .trim()
  .min(2, 'Informe de 2 a 30 caracteres para buscar')
  .max(30, 'Informe de 2 a 30 caracteres para buscar');

export const MAX_AMOUNT_CENTS = 100_000_000;

export function firstIssue(error: z.ZodError): ActionResult {
  return { ok: false, error: error.issues[0]?.message ?? 'Dados inválidos.' };
}

export const str = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};
