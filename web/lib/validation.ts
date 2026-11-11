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

export const MAX_AMOUNT_CENTS = 100_000_000;

export function firstIssue(error: z.ZodError): ActionResult {
  return { ok: false, error: error.issues[0]?.message ?? 'Dados inválidos.' };
}

export const str = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};
