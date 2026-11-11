import { NotFoundState } from '@/features/ui/NotFoundState';

// Rotas inexistentes caem aqui, fora do shell (route group (app)).
export default function NotFound() {
  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto max-w-xl px-4 py-16 focus:outline-none">
      <NotFoundState title="Essa página sumiu do mapa" description="O link pode estar errado ou a página mudou de lugar." backHref="/" backLabel="Ir para o início" />
    </main>
  );
}
