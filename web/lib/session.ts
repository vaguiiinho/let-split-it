import 'server-only';

import { cookies } from 'next/headers';
import { cookieSecure } from './cookie-config';

/** Nome do cookie httpOnly que guarda o JWT da API (spec 004). Mantenha igual ao `proxy.ts`. */
export const SESSION_COOKIE = 'session';

/** 7 dias, igual ao `exp` do token emitido pela API (A2). */
export const SESSION_MAX_AGE = 7 * 24 * 3600;

export async function getSessionToken(): Promise<string | undefined> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? value : undefined;
}

/** Grava a sessão. Só funciona em Server Action ou Route Handler. */
export async function setSession(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
    secure: cookieSecure(),
  });
}

/** Apaga a sessão. Só funciona em Server Action ou Route Handler. */
export async function clearSession(): Promise<void> {
  (await cookies()).delete({ name: SESSION_COOKIE, path: '/' });
}
