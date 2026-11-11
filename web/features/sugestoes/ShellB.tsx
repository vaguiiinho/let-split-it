'use client';
// TODO(remover-apos-escolha) — variação B: sidebar recolhível só com ícones + topbar com busca visual.

import { useSyncExternalStore } from 'react';
import { Logo } from '@/features/shell/Logo';
import { SAMPLE_NAV } from './sample-data';
import { SuggestionPage } from './SuggestionBanner';

const KEY = 'racha-ai:sugestao-b:sidebar-recolhida';
const EVENT = 'racha-ai:sugestao-b';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

function setCollapsed(value: boolean) {
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    /* sem storage: só não persiste */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function ShellB({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);

  return (
    <SuggestionPage>
      <header className="sticky top-[var(--shell-top)] z-40 flex h-16 items-center gap-3 border-b-2 border-line bg-surface/95 px-4 backdrop-blur">
        <Logo />
        <form role="search" className="ml-auto w-full max-w-xs" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="busca-b" className="sr-only">
            Buscar rolês e pessoas (demonstração)
          </label>
          <input id="busca-b" type="search" className="input" placeholder="🔎 Buscar rolês e pessoas…" />
        </form>
      </header>
      <div className="flex">
        <aside
          aria-label="Menu lateral"
          className={`sticky top-[calc(var(--shell-top)+4rem)] h-[calc(100dvh-var(--shell-top)-4rem)] shrink-0 border-r-2 border-line bg-surface/60 p-2 transition-[width] ${collapsed ? 'w-16' : 'w-16 md:w-64'}`}
        >
          <button
            type="button"
            className="btn btn-ghost mb-3 hidden w-full px-0 md:inline-flex"
            aria-expanded={!collapsed}
            aria-controls="nav-b"
            onClick={() => setCollapsed(!collapsed)}
          >
            <span aria-hidden>{collapsed ? '»' : '«'}</span>
            <span className={collapsed ? 'sr-only' : ''}>{collapsed ? 'Expandir menu' : 'Recolher menu'}</span>
          </button>
          <nav id="nav-b" aria-label="Principal">
            <ul className="space-y-1">
              {SAMPLE_NAV.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className={`nav-link ${collapsed ? 'justify-center px-0' : 'max-md:justify-center max-md:px-0'}`}
                    aria-current={item.current ? 'page' : undefined}
                    title={item.label}
                  >
                    <span aria-hidden className="text-lg">
                      {item.icon}
                    </span>
                    <span className={collapsed ? 'sr-only' : 'max-md:sr-only'}>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 pt-6 pb-16 focus:outline-none">
          {children}
        </main>
      </div>
      <footer className="border-t-2 border-line px-4 py-6 text-center text-sm">Footer simples (variação B).</footer>
    </SuggestionPage>
  );
}
