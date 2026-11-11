'use client';

import Link from 'next/link';

// Em produção o Next oculta a mensagem de erros do servidor, então a dica da API vale sempre.
const API_HINT = /api|fetch|ECONNREFUSED|failed/i;

export function ErrorState({
  error,
  reset,
  showBack = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  showBack?: boolean;
}) {
  const looksLikeApiDown = !error.message || API_HINT.test(error.message) || !!error.digest;
  return (
    <div role="alert" className="card border-neg">
      <p aria-hidden className="text-5xl">
        🔌
      </p>
      <h1 className="mt-3 text-2xl font-black">Eita, deu ruim!</h1>
      {looksLikeApiDown ? (
        <p className="mt-2">
          Não consegui falar com a API do Racha Aí. Ela provavelmente está fora do ar. Suba a API com{' '}
          <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-sm font-bold">npm run dev</code> e tente
          de novo.
        </p>
      ) : (
        <p className="mt-2">{error.message}</p>
      )}
      {error.digest && <p className="mt-2 text-xs text-muted-strong">Código: {error.digest}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Tentar de novo
        </button>
        {showBack && (
          <Link href="/groups" className="btn btn-ghost">
            Voltar pros rolês
          </Link>
        )}
      </div>
    </div>
  );
}
