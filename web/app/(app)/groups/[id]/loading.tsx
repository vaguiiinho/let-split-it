import { Skeleton } from '@/features/ui/Skeleton';

/** Fica abaixo do cabeçalho e das abas (que vêm do layout). */
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  );
}
