import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Racha Aí', template: '%s · Racha Aí' },
  description: 'Divida as contas do rolê e quite tudo com o mínimo de PIX.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff7e8' },
    { media: '(prefers-color-scheme: dark)', color: '#15121d' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:font-bold focus:text-accent-ink"
        >
          Pular para o conteúdo
        </a>
        <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-5 pb-2">
          <Link href="/" className="group inline-flex items-center gap-2 rounded-lg" aria-label="Racha Aí — início">
            <span
              aria-hidden
              className="grid size-10 -rotate-6 place-items-center rounded-xl border-2 border-line bg-accent text-xl shadow-sticker-sm transition-transform group-hover:rotate-3"
            >
              🍕
            </span>
            <span className="text-2xl font-black tracking-tight">
              Racha <span className="text-brand">Aí</span>
            </span>
          </Link>
          <span className="hidden text-sm font-semibold text-muted sm:block">conta dividida, amizade mantida</span>
        </header>
        <main id="conteudo" className="mx-auto max-w-3xl px-4 pt-4 pb-16">
          {children}
        </main>
        <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-xs text-muted">
          Feito com 🧡 pra acabar com o “depois eu te passo”.
        </footer>
      </body>
    </html>
  );
}
