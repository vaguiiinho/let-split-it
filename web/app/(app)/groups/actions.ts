'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, toUserMessage } from '@/lib/api';
import type { ActionResult } from '@/lib/types';
import { firstIssue, groupNameSchema, str } from '@/lib/validation';

export async function createGroupAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = groupNameSchema.safeParse(str(formData, 'name'));
  if (!parsed.success) return firstIssue(parsed.error);
  let id: string;
  try {
    id = (await api.createGroup(parsed.data)).id;
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
  revalidatePath('/', 'layout');
  redirect(`/groups/${id}`);
}
