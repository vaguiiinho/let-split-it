import { Skeleton } from '@/features/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Carregando rolês…</span>
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-32" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  );
}
