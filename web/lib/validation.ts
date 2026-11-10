import { z } from 'zod';
import type { ActionResult } from './types';

export const idSchema = z.string().trim().min(1, 'Identificador inválido.').max(100);

export const groupNameSchema = z
  .string()
  .trim()
  .min(1, 'Dá um nome pro rolê.')
  .max(60, 'Nome do rolê: no máximo 60 caracteres.');

export const memberSchema = z.object({
  groupId: idSchema,
  name: z.string().trim().min(1, 'Qual o nome da pessoa?').max(40, 'Nome: no máximo 40 caracteres.'),
  pixKey: z
    .string()
    .trim()
    .max(77, 'Chave PIX: no máximo 77 caracteres.')
    .transform((v) => (v === '' ? undefined : v)),
});

export const MAX_AMOUNT_CENTS = 100_000_000;

export function firstIssue(error: z.ZodError): ActionResult {
  return { ok: false, error: error.issues[0]?.message ?? 'Dados inválidos.' };
}

export const str = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};
