/** Número de destaque (KPI). `<dl>`-friendly: rótulo em <dt>, valor em <dd>. */
export function StatTile({
  label,
  value,
  emoji,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  emoji: string;
  hint?: string;
  tone?: 'default' | 'pos' | 'neg';
}) {
  const valueColor = tone === 'pos' ? 'text-pos' : tone === 'neg' ? 'text-neg' : 'text-ink';
  return (
    <div className="rounded-2xl border-2 border-line bg-surface p-4 shadow-sticker-sm">
      <dt className="flex items-center gap-2 text-sm font-bold text-muted-strong">
        <span aria-hidden>{emoji}</span>
        {label}
      </dt>
      <dd className={`mt-1 text-2xl font-black break-words tabular-nums ${valueColor}`}>{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted-strong">{hint}</dd>}
    </div>
  );
}
