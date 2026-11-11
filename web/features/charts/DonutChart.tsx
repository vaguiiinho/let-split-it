import { donutArcs } from '@/lib/charts';
import { formatBRL } from '@/lib/money';
import { ChartFrame } from './ChartFrame';

const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

/** Rosca com legenda rotulada (cor + nome + valor + %), nunca só cor. */
export function DonutChart({
  id,
  title,
  subtitle,
  slices,
  emptyText,
}: {
  id: string;
  title: string;
  subtitle?: string;
  slices: { label: string; value: number; color: string }[];
  emptyText: string;
}) {
  const arcs = donutArcs(slices.map((s) => s.value));
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const share = (v: number) => (total > 0 ? pct.format(Math.max(0, v) / total) : pct.format(0));
  const summary = `${title}: ${slices.map((s) => `${s.label} ${formatBRL(s.value)} (${share(s.value)})`).join('; ')}.`;

  return (
    <ChartFrame
      id={id}
      title={title}
      subtitle={subtitle}
      empty={arcs.length === 0}
      emptyText={emptyText}
      table={{ columns: ['Situação', 'Valor'], rows: slices.map((s) => [s.label, `${formatBRL(s.value)} (${share(s.value)})`]) }}
    >
      <div className="flex flex-wrap items-center gap-6">
        <svg viewBox="0 0 160 160" role="img" aria-label={summary} className="size-40 shrink-0">
          {arcs.map((a) => {
            const slice = slices[a.index]!;
            return (
              <path key={a.index} d={a.d} fill={slice.color} fillRule="evenodd" stroke="var(--surface)" strokeWidth={2}>
                <title>{`${slice.label}: ${formatBRL(slice.value)} (${share(slice.value)})`}</title>
              </path>
            );
          })}
          <text x={80} y={76} textAnchor="middle" fontSize={11} fill="var(--muted-strong)">
            total
          </text>
          <text x={80} y={94} textAnchor="middle" fontSize={14} fontWeight={900} fill="var(--ink)">
            {formatBRL(total)}
          </text>
        </svg>
        <ul className="min-w-0 flex-1 space-y-2" aria-hidden>
          {slices.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className="size-3 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="font-bold text-ink">{s.label}</span>
              <span className="ml-auto tabular-nums">{formatBRL(s.value)}</span>
              <span className="w-10 text-right text-sm">{share(s.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}
