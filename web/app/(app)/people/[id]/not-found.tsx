import { NotFoundState } from '@/features/ui/NotFoundState';

export default function PersonNotFound() {
  return (
    <NotFoundState
      title="Essa pessoa sumiu do mapa"
      description="Talvez ela tenha sido excluída, ou o link veio errado."
      backHref="/people"
      backLabel="Voltar pra Pessoas"
    />
  );
}
