/**
 * `secure` do cookie de sessão: `SESSION_COOKIE_SECURE` ('true' | 'false') quando definida,
 * senão só em produção. `false` em produção é paliativo para quando o proxy não termina TLS.
 */
export function cookieSecure(env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return env.NODE_ENV === 'production';
}
