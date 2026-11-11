'use client';

import { useCopy } from '@/features/ui/useCopy';

export function WhatsAppSummaryButton({ text }: { text: string }) {
  const { status, copy } = useCopy();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn btn-accent text-sm" onClick={() => copy(text)}>
        {status === 'copied' ? '✓ Resumo copiado!' : '💬 Copiar resumo pro WhatsApp'}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded text-sm font-bold text-link underline underline-offset-2"
      >
        Abrir no WhatsApp<span className="sr-only"> (abre em nova aba)</span>
      </a>
      <span aria-live="polite" className="sr-only">
        {status === 'copied' ? 'Resumo copiado' : status === 'failed' ? 'Não foi possível copiar o resumo' : ''}
      </span>
    </div>
  );
}
