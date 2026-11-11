export function SectionTitle({
  id,
  emoji,
  children,
  aside,
}: {
  id: string;
  emoji: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="flex items-center gap-2 text-xl font-black">
        <span aria-hidden className="grid size-9 place-items-center rounded-lg border-2 border-line bg-surface-2 text-lg">
          {emoji}
        </span>
        {children}
      </h2>
      {aside}
    </div>
  );
}
