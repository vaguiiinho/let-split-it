import { Skeleton } from '@/features/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Carregando o rolê…</span>
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
    </div>
  );
}
