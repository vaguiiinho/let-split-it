'use server';

import { redirect } from 'next/navigation';
import { ApiError, api, toUserMessage } from '@/lib/api';
import { safeNextPath } from '@/lib/auth-redirect';
import { setSession } from '@/lib/session';
import type { ActionResult } from '@/lib/types';
import { firstIssue, loginSchema, str } from '@/lib/validation';

export async function loginAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ username: str(fd, 'username'), password: str(fd, 'password') });
  if (!parsed.success) return firstIssue(parsed.error);
  try {
    const { accessToken } = await api.login(parsed.data.username, parsed.data.password);
    await setSession(accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { ok: false, error: 'Usuário ou senha inválidos' };
    return { ok: false, error: toUserMessage(err) };
  }
  redirect(safeNextPath(str(fd, 'next')));
}
