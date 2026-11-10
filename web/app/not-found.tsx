import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card text-center">
      <p aria-hidden className="text-5xl">
        🕵️
      </p>
      <h1 className="mt-3 text-2xl font-black">Esse rolê sumiu do mapa</h1>
      <p className="mt-2 text-muted">Talvez ele tenha sido excluído, ou o link veio errado no grupo.</p>
      <Link href="/" className="btn btn-primary mt-5">
        Voltar pros rolês
      </Link>
    </div>
  );
}
