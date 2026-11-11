import Link from 'next/link';

/** Cabeçalho de página: link de volta opcional, título, descrição e ações à direita. */
export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div>
      {back && (
        <Link href={back.href} className="inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-bold text-muted hover:text-ink">
          ← {back.label}
        </Link>
      )}
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-black break-words sm:text-4xl">{title}</h1>
          {description && <p className="mt-1">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
