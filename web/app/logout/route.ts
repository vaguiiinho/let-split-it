import { clearSession } from '@/lib/session';

/**
 * Destino do 401 da API (lib/api.ts): Server Components não podem apagar cookie, então
 * redirecionam para cá; o cookie é apagado e a pessoa volta ao login com o aviso de sessão expirada.
 * Normalmente o `proxy.ts` já responde /logout (redirect relativo ao host público); este handler
 * fica como reserva caso o matcher do proxy deixe de cobrir a rota.
 */
export async function GET() {
  await clearSession();
  return new Response(null, { status: 307, headers: { Location: '/login?expired=1', 'Cache-Control': 'no-store' } });
}
