/** Estado vazio padrão: emoji + título + copy simpática (+ ação opcional). */
export function EmptyState({
  emoji,
  title,
  children,
  action,
}: {
  emoji: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card text-center">
      <p aria-hidden className="text-5xl">
        {emoji}
      </p>
      <p className="mt-3 text-lg font-extrabold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-prose">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
