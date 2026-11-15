/** Rotas de autenticação que nunca servem de destino depois do login. */
const AUTH_PATHS = new Set(['/login', '/logout']);

/**
 * Sanitiza o `?next=` do login para evitar open redirect: só caminhos internos absolutos
 * (`/algo`), nunca `//host`, `/\host`, esquemas (`https:`, `javascript:`), quebras de linha
 * ou as próprias rotas de login/logout. Qualquer outra coisa vira `/`.
 */
export function safeNextPath(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  if (/[\r\n\t\0\\]/.test(raw)) return '/';
  const pathname = raw.split(/[?#]/, 1)[0] ?? '';
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (AUTH_PATHS.has(normalized)) return '/';
  return raw;
}

/** URL do login preservando para onde a pessoa queria ir: `/login?next=%2Fgroups`. */
export function loginRedirectUrl(pathname: string, search = ''): string {
  const next = safeNextPath(`${pathname}${search}`);
  return next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;
}
