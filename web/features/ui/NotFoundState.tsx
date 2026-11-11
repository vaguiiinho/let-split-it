import Link from 'next/link';

export function NotFoundState({
  emoji = '🕵️',
  title = 'Esse rolê sumiu do mapa',
  description = 'Talvez ele tenha sido excluído, ou o link veio errado no grupo.',
  backHref = '/groups',
  backLabel = 'Voltar pros rolês',
}: {
  emoji?: string;
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="card text-center">
      <p aria-hidden className="text-5xl">
        {emoji}
      </p>
      <h1 className="mt-3 text-2xl font-black">{title}</h1>
      <p className="mt-2">{description}</p>
      <Link href={backHref} className="btn btn-primary mt-5">
        {backLabel}
      </Link>
    </div>
  );
}
