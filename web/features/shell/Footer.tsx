import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t-2 border-line px-4 py-6 text-center text-sm">
      <p>Feito com 🧡 pra acabar com o “depois eu te passo”.</p>
      <p className="mt-1">
        <Link href="/sugestoes" className="inline-flex min-h-11 items-center rounded font-bold text-link underline underline-offset-2">Sugestões de layout</Link>{/* TODO(remover-apos-escolha) */}
      </p>
    </footer>
  );
}
