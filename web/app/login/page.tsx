import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/LoginForm';
import { Logo } from '@/features/shell/Logo';
import { safeNextPath } from '@/lib/auth-redirect';
import { loginAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entrar' };

const DEMO_ACCOUNTS = [
  { username: 'huguinho', password: 'huguinho123' },
  { username: 'luizinho', password: 'luizinho123' },
  { username: 'zezinho', password: 'zezinho123' },
] as const;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Fora do route group (app): sem navbar/sidebar. */
export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(first(params.next));
  const expired = first(params.expired) === '1';
  const showDemo = process.env.DEMO_ACCOUNT_HINT === 'on';

  return (
    <main id="conteudo" tabIndex={-1} className="grid min-h-dvh place-items-center px-4 py-10 focus:outline-none">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo asLink={false} />
        </div>
        <section aria-labelledby="login-title" className="card">
          <h1 id="login-title" className="text-2xl font-black">
            Entrar
          </h1>
          <p className="mt-1 mb-5">Bora acertar as contas do rolê.</p>
          {expired && (
            <p role="status" className="mb-4 rounded-xl border-2 border-accent bg-surface-2 px-3 py-2 text-sm font-semibold text-ink">
              <span aria-hidden>⏰</span> Sua sessão expirou. Entre de novo.
            </p>
          )}
          <LoginForm action={loginAction} next={next === '/' ? undefined : next} />
        </section>
        {showDemo && (
          <section aria-labelledby="demo-title" className="card">
            <h2 id="demo-title" className="flex items-center gap-2 font-extrabold">
              <span aria-hidden>🧪</span> Contas de demonstração
            </h2>
            <p className="mt-1 text-sm">Use uma delas para testar. Os dados podem ser apagados de tempos em tempos.</p>
            <dl className="mt-3 divide-y-2 divide-line/40 text-sm">
              {DEMO_ACCOUNTS.map((a) => (
                <div key={a.username} className="flex flex-wrap justify-between gap-x-4 py-2">
                  <dt className="font-mono font-bold">{a.username}</dt>
                  <dd className="font-mono text-muted-strong">
                    <span className="sr-only">senha: </span>
                    {a.password}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}
