'use server';

import { revalidatePath } from 'next/cache';
import { api, toUserMessage } from '@/lib/api';
import { getMe } from '@/lib/queries';
import type { ActionResult, PurgeDemoActionResult } from '@/lib/types';
import { createUserSchema, firstIssue, str } from '@/lib/validation';

/** Checagem otimista (a API devolve 403 de qualquer forma): evita chamar a API por quem não é admin. */
async function assertAdmin(): Promise<string | null> {
  const me = await getMe();
  return me.role === 'ADMIN' ? null : 'Acesso negado';
}

export async function createUserAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = createUserSchema.safeParse({
    username: str(fd, 'username'),
    password: str(fd, 'password'),
    name: str(fd, 'name'),
    role: str(fd, 'role') || 'USER',
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { username, password, name, role } = parsed.data;
  try {
    const denied = await assertAdmin();
    if (denied) return { ok: false, error: denied };
    await api.createUser({ username, password, role, ...(name ? { name } : {}) });
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function purgeDemoDataAction(): Promise<PurgeDemoActionResult> {
  try {
    const denied = await assertAdmin();
    if (denied) return { ok: false, error: denied };
    const result = await api.purgeDemoData();
    revalidatePath('/', 'layout');
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
}
