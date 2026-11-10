export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl border-2 border-line/20 bg-surface-2 ${className}`} />;
}
