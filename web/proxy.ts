import { NextResponse, type NextRequest } from 'next/server';
import { loginRedirectUrl } from './lib/auth-redirect';

// Mesmo nome de `SESSION_COOKIE` em lib/session.ts (que é server-only e não entra aqui).
const SESSION_COOKIE = 'session';

/**
 * Checagem otimista de sessão (Next 16: `proxy.ts`, antigo `middleware.ts`). Só olha se o cookie
 * existe; a validade do token é conferida pela API a cada chamada (401 → /logout).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Destino do 401 da API (lib/api.ts): apaga o cookie e volta ao login. Fica aqui (e não só no
  // app/logout/route.ts) porque o redirect do proxy sai relativo ao host público; o do Route Handler
  // sai absoluto com o host interno do container (ex.: http://localhost:3000) atrás do nginx.
  if (pathname === '/logout') {
    const res = NextResponse.redirect(new URL('/login?expired=1', request.url));
    res.cookies.delete({ name: SESSION_COOKIE, path: '/' });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  if (pathname === '/login') {
    return hasSession ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  if (!hasSession) return NextResponse.redirect(new URL(loginRedirectUrl(pathname, search), request.url));
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Tudo, menos assets do Next, favicon e arquivos estáticos (com extensão).
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|css|js|map)$).*)',
  ],
};
