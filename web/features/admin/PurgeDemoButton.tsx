'use client';

import { startTransition, useActionState } from 'react';
import { plural } from '@/lib/format';
import type { PurgeDemoActionResult } from '@/lib/types';

/** Botão "Limpar dados de demonstração" (Adendo A, DM5): confirma, chama a API e mostra as contagens. */
export function PurgeDemoButton({ action }: { action: () => Promise<PurgeDemoActionResult> }) {
  const [state, dispatch, pending] = useActionState<PurgeDemoActionResult | null>(() => action(), null);

  return (
    <div>
      <button
        type="button"
        className="btn btn-danger"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              'Apagar os rolês, convites e pessoas criados pelas contas de demonstração? As contas demo continuam. Não dá pra desfazer.',
            )
          )
            return;
          startTransition(() => dispatch());
        }}
      >
        {pending ? 'Limpando…' : '🧹 Limpar dados de demonstração'}
      </button>
      <div aria-live="polite">
        {state?.ok === true && (
          <p role="status" className="mt-3 rounded-xl border-2 border-pos bg-pos-soft px-3 py-2 text-sm font-semibold text-pos">
            Pronto! Apagados: {plural(state.result.groups, 'rolê', 'rolês')}, {plural(state.result.invites, 'convite', 'convites')}{' '}
            e {plural(state.result.people, 'pessoa', 'pessoas')}.
          </p>
        )}
        {state?.ok === false && (
          <p role="alert" className="alert-error">
            {state.error}
          </p>
        )}
      </div>
    </div>
  );
}
