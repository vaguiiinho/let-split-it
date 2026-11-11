// TODO(remover-apos-escolha) — variação C: tabs no topo + sidebar contextual à direita (sem sidebar global).
import { Logo } from '@/features/shell/Logo';
import { SAMPLE_NAV } from './sample-data';
import { SuggestionPage } from './SuggestionBanner';

const SHORTCUTS = [
  { label: 'Lançar despesa', icon: '🧾' },
  { label: 'Ver acerto', icon: '🤝' },
  { label: 'Adicionar pessoa', icon: '➕' },
  { label: 'Copiar resumo pro WhatsApp', icon: '💬' },
];

export function ShellC({ children }: { children: React.ReactNode }) {
  return (
    <SuggestionPage>
      <header className="sticky top-[var(--shell-top)] z-40 border-b-2 border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Logo />
          <a href="#" className="btn btn-primary ml-auto px-3 text-sm">
            <span aria-hidden>✨</span> Novo rolê
          </a>
        </div>
        <nav aria-label="Principal" className="mx-auto max-w-6xl overflow-x-auto px-4">
          <ul className="flex gap-1">
            {SAMPLE_NAV.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  aria-current={item.current ? 'page' : undefined}
                  className="flex min-h-11 items-center gap-2 border-b-4 border-transparent px-3 font-bold whitespace-nowrap text-muted-strong hover:text-ink aria-[current=page]:border-brand aria-[current=page]:text-ink"
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 pb-16 lg:grid-cols-[1fr_16rem]">
        <main id="conteudo" tabIndex={-1} className="min-w-0 focus:outline-none">
          {children}
        </main>
        <aside aria-labelledby="atalhos-c" className="lg:sticky lg:top-[calc(var(--shell-top)+7rem)] lg:self-start">
          <div className="card p-4 sm:p-4">
            <h2 id="atalhos-c" className="text-sm font-extrabold tracking-wide uppercase">
              Atalhos do rolê
            </h2>
            <ul className="mt-3 space-y-1">
              {SHORTCUTS.map((s) => (
                <li key={s.label}>
                  <a href="#" className="nav-link text-sm">
                    <span aria-hidden>{s.icon}</span>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      <footer className="border-t-2 border-line px-4 py-6 text-center text-sm">Footer simples (variação C).</footer>
    </SuggestionPage>
  );
}
