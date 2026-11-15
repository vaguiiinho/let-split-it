import Link from 'next/link';

/** Marca do app. Com `asLink={false}` (tela de login) vira só texto, sem apontar para uma rota protegida. */
export function Logo({ asLink = true }: { asLink?: boolean }) {
  const content = (
    <>
      <span
        aria-hidden
        className="grid size-9 -rotate-6 place-items-center rounded-xl border-2 border-line bg-accent text-lg shadow-sticker-sm transition-transform group-hover:rotate-3"
      >
        🍕
      </span>
      <span className="text-xl font-black tracking-tight">
        Racha <span className="text-accent">Aí</span>
      </span>
    </>
  );
  if (!asLink) return <span className="group inline-flex min-h-11 items-center gap-2">{content}</span>;
  return (
    <Link href="/" className="group inline-flex min-h-11 items-center gap-2 rounded-lg" aria-label="Racha Aí — início">
      {content}
    </Link>
  );
}
