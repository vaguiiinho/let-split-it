'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { api, toUserMessage } from '@/lib/api';
import { parseMoneyToCents } from '@/lib/money';
import type { ActionResult } from '@/lib/types';
import { MAX_AMOUNT_CENTS, firstIssue, idSchema, memberSchema, str } from '@/lib/validation';

type Prev = ActionResult | null;

async function run(groupId: string, fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
  revalidatePath(`/groups/${groupId}`);
  revalidatePath('/');
  return { ok: true };
}

export async function addMemberAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = memberSchema.safeParse({
    groupId: str(fd, 'groupId'),
    name: str(fd, 'name'),
    pixKey: str(fd, 'pixKey'),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { groupId, name, pixKey } = parsed.data;
  return run(groupId, () => api.addMember(groupId, pixKey ? { name, pixKey } : { name }));
}

const pairSchema = z.object({ groupId: idSchema, targetId: idSchema });

export async function removeMemberAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = pairSchema.safeParse({ groupId: str(fd, 'groupId'), targetId: str(fd, 'memberId') });
  if (!parsed.success) return firstIssue(parsed.error);
  const { groupId, targetId } = parsed.data;
  return run(groupId, () => api.removeMember(groupId, targetId));
}

export async function removeExpenseAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = pairSchema.safeParse({ groupId: str(fd, 'groupId'), targetId: str(fd, 'expenseId') });
  if (!parsed.success) return firstIssue(parsed.error);
  const { groupId, targetId } = parsed.data;
  return run(groupId, () => api.removeExpense(groupId, targetId));
}

const expenseSchema = z.object({
  groupId: idSchema,
  description: z
    .string()
    .trim()
    .min(1, 'Descreva a despesa (ex.: carne, cerveja).')
    .max(80, 'Descrição: no máximo 80 caracteres.'),
  amountCents: z
    .number({ error: 'Valor inválido. Use algo como 12,34.' })
    .int()
    .positive('O valor precisa ser maior que zero.')
    .max(MAX_AMOUNT_CENTS, 'Valor máximo: R$ 1.000.000,00.'),
  payerId: idSchema.refine(Boolean, 'Quem pagou?'),
  participants: z
    .array(
      z.object({
        memberId: idSchema,
        weight: z
          .number({ error: 'Peso inválido.' })
          .int('O peso precisa ser um número inteiro.')
          .min(1, 'O peso vai de 1 a 100.')
          .max(100, 'O peso vai de 1 a 100.'),
      }),
    )
    .min(1, 'Marque pelo menos uma pessoa pra dividir.')
    .refine((ps) => new Set(ps.map((p) => p.memberId)).size === ps.length, 'Participante repetido.'),
});

export async function addExpenseAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const payerId = str(fd, 'payerId');
  if (!payerId) return { ok: false, error: 'Escolha quem pagou.' };
  const amountCents = parseMoneyToCents(str(fd, 'amount'));
  const participants = fd
    .getAll('participant')
    .filter((v): v is string => typeof v === 'string')
    .map((memberId) => {
      const raw = str(fd, `weight-${memberId}`).trim();
      return { memberId, weight: raw === '' ? 1 : Number(raw) };
    });

  const parsed = expenseSchema.safeParse({
    groupId: str(fd, 'groupId'),
    description: str(fd, 'description'),
    amountCents: amountCents ?? Number.NaN,
    payerId,
    participants,
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { groupId, ...input } = parsed.data;
  return run(groupId, () => api.addExpense(groupId, input));
}

export async function deleteGroupAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = idSchema.safeParse(str(fd, 'groupId'));
  if (!parsed.success) return firstIssue(parsed.error);
  try {
    await api.deleteGroup(parsed.data);
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
  revalidatePath('/');
  redirect('/');
}
