// TODO(remover-apos-escolha) — faixa que identifica as páginas de sugestão de layout.
import Link from 'next/link';

/** Faixa fixa no topo (h-11). Quem usa deve definir `--shell-top: 2.75rem` no wrapper (ver SuggestionPage). */
export function SuggestionBanner({ showBack = true }: { showBack?: boolean }) {
  return (
    <div
      role="note"
      className="sticky top-0 z-50 flex h-11 items-center justify-between gap-2 border-b-2 border-accent-ink bg-accent px-4 text-accent-ink"
    >
      <p className="truncate text-sm font-black tracking-wide text-accent-ink">SUGESTÃO — REMOVER APÓS A ESCOLHA</p>
      {showBack && (
        <Link
          href="/sugestoes"
          className="inline-flex min-h-11 shrink-0 items-center rounded text-sm font-bold text-accent-ink underline underline-offset-2"
        >
          <span aria-hidden>←&nbsp;</span>
          <span className="sm:hidden">voltar</span>
          <span className="hidden sm:inline">voltar às sugestões</span>
        </Link>
      )}
    </div>
  );
}

/** Wrapper comum: banner + deslocamento das partes "sticky" dos shells. */
export function SuggestionPage({ children, showBack = true }: { children: React.ReactNode; showBack?: boolean }) {
  return (
    <div className="[--shell-top:2.75rem]">
      <SuggestionBanner showBack={showBack} />
      {children}
    </div>
  );
}
