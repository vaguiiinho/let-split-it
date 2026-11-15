'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, toUserMessage } from '@/lib/api';
import type { ActionResult } from '@/lib/types';
import { firstIssue, idSchema, str } from '@/lib/validation';

type Prev = ActionResult | null;

/** Aceita o convite e leva a pessoa direto para o rolê. */
export async function acceptInviteAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(str(fd, 'inviteId'));
  if (!id.success) return firstIssue(id.error);
  let groupId: string;
  try {
    groupId = (await api.acceptInvite(id.data)).groupId;
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
  revalidatePath('/', 'layout');
  redirect(`/groups/${groupId}`);
}

export async function declineInviteAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(str(fd, 'inviteId'));
  if (!id.success) return firstIssue(id.error);
  try {
    await api.declineInvite(id.data);
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
