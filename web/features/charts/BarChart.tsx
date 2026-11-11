import { barLayout } from '@/lib/charts';
import { formatBRL } from '@/lib/money';
import { ChartFrame } from './ChartFrame';

const WIDTH = 320;
const truncate = (s: string, n = 30) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Barras horizontais (série única, centavos). Rótulo à esquerda e valor à direita, acima da barra. */
export function BarChart({
  id,
  title,
  subtitle,
  data,
  color = 'var(--chart-1)',
  columns,
  emptyText,
}: {
  id: string;
  title: string;
  subtitle?: string;
  data: { label: string; value: number }[];
  color?: string;
  columns: [string, string];
  emptyText: string;
}) {
  const { bars, height } = barLayout(data, { width: WIDTH });
  const visible = bars.filter((b) => b.value > 0);
  const summary = `${title}: ${visible.map((b) => `${b.label} ${formatBRL(b.value)}`).join('; ')}.`;

  return (
    <ChartFrame
      id={id}
      title={title}
      subtitle={subtitle}
      empty={visible.length === 0}
      emptyText={emptyText}
      table={{ columns, rows: visible.map((b) => [b.label, formatBRL(b.value)]) }}
    >
      <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={summary} className="h-auto w-full overflow-visible">
        {visible.map((b, i) => (
          <g key={i}>
            <title>{`${b.label}: ${formatBRL(b.value)}`}</title>
            <text x={0} y={b.labelY} fontSize={13} fontWeight={700} fill="var(--ink)">
              {truncate(b.label)}
            </text>
            <text x={WIDTH} y={b.labelY} fontSize={13} textAnchor="end" fill="var(--muted-strong)" className="tabular-nums">
              {formatBRL(b.value)}
            </text>
            <rect x={0} y={b.y} width={WIDTH} height={b.height} rx={4} fill="var(--surface-2)" />
            <rect x={b.x} y={b.y} width={b.width} height={b.height} rx={4} fill={color} />
          </g>
        ))}
      </svg>
    </ChartFrame>
  );
}
