'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { api, toUserMessage } from '@/lib/api';
import { parseMoneyToCents } from '@/lib/money';
import type { ActionResult } from '@/lib/types';
import {
  MAX_AMOUNT_CENTS,
  addExistingMemberSchema,
  firstIssue,
  idSchema,
  newMemberSchema,
  str,
  updateGroupSchema,
} from '@/lib/validation';

type Prev = ActionResult | null;

/** Executa a mutação, converte erros da API (400/404/409) em mensagem e revalida tudo no sucesso. */

async function run(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function addExistingMemberAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = addExistingMemberSchema.safeParse({ groupId: str(fd, 'groupId'), personId: str(fd, 'personId') });
  if (!parsed.success) return firstIssue(parsed.error);
  const { groupId, personId } = parsed.data;
  return run(() => api.addMember(groupId, { personId }));
}

export async function addNewMemberAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = newMemberSchema.safeParse({
    groupId: str(fd, 'groupId'),
    name: str(fd, 'name'),
    pixKey: str(fd, 'pixKey'),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { groupId, name, pixKey } = parsed.data;
  return run(() => api.addMember(groupId, pixKey ? { name, pixKey } : { name }));
}

export async function updateGroupAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = updateGroupSchema.safeParse({ groupId: str(fd, 'groupId'), name: str(fd, 'name') });
  if (!parsed.success) return firstIssue(parsed.error);
  const { groupId, name } = parsed.data;
  const result = await run(() => api.updateGroup(groupId, name));
  if (!result.ok) return result;
  redirect(`/groups/${groupId}`);
}

const pairSchema = z.object({ groupId: idSchema, targetId: idSchema });

export async function removeMemberAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = pairSchema.safeParse({ groupId: str(fd, 'groupId'), targetId: str(fd, 'memberId') });
  if (!parsed.success) return firstIssue(parsed.error);
  const { groupId, targetId } = parsed.data;
  return run(() => api.removeMember(groupId, targetId));
}

export async function removeExpenseAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = pairSchema.safeParse({ groupId: str(fd, 'groupId'), targetId: str(fd, 'expenseId') });
  if (!parsed.success) return firstIssue(parsed.error);
  const { groupId, targetId } = parsed.data;
  return run(() => api.removeExpense(groupId, targetId));
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
  return run(() => api.addExpense(groupId, input));
}

export async function removePaymentAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = pairSchema.safeParse({ groupId: str(fd, 'groupId'), targetId: str(fd, 'paymentId') });
  if (!parsed.success) return firstIssue(parsed.error);
  const { groupId, targetId } = parsed.data;
  return run(() => api.removePayment(groupId, targetId));
}

const paymentSchema = z
  .object({
    groupId: idSchema,
    fromId: idSchema,
    toId: idSchema,
    amountCents: z
      .number({ error: 'Valor inválido. Use algo como 12,34.' })
      .int()
      .positive('O valor precisa ser maior que zero.')
      .max(MAX_AMOUNT_CENTS, 'Valor máximo: R$ 1.000.000,00.'),
  })
  .refine((p) => p.fromId !== p.toId, 'Quem paga e quem recebe precisam ser pessoas diferentes.');

export async function registerPaymentAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const amountCents = parseMoneyToCents(str(fd, 'amount'));
  const parsed = paymentSchema.safeParse({
    groupId: str(fd, 'groupId'),
    fromId: str(fd, 'fromId'),
    toId: str(fd, 'toId'),
    amountCents: amountCents ?? Number.NaN,
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { groupId, ...input } = parsed.data;
  return run(() => api.registerPayment(groupId, input));
}

export async function deleteGroupAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = idSchema.safeParse(str(fd, 'groupId'));
  if (!parsed.success) return firstIssue(parsed.error);
  try {
    await api.deleteGroup(parsed.data);
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
  revalidatePath('/', 'layout');
  redirect('/groups');
}
