import { linePath, ticks } from '@/lib/charts';
import { formatBRL, formatBRLCompact } from '@/lib/money';
import { ChartFrame } from './ChartFrame';

const W = 320;
const H = 180;
const LEFT = 56; // espaço para os rótulos do eixo Y
const BOTTOM = 22; // espaço para os rótulos do eixo X
const TOP = 8;
const PLOT_W = W - LEFT - 8;
const PLOT_H = H - BOTTOM - TOP;

/** Linha (série única) com grade recessiva, pontos ≥ 8px e rótulos do eixo X. */
export function LineChart({
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
  data: { label: string; longLabel: string; value: number }[];
  color?: string;
  columns: [string, string];
  emptyText: string;
}) {
  const { max, points, d, area } = linePath(
    data.map((p) => p.value),
    { width: PLOT_W, height: PLOT_H, padX: 12 },
  );
  const grid = ticks(max, 4);
  const summary = `${title}: ${data.map((p) => `${p.longLabel} ${formatBRL(p.value)}`).join('; ')}.`;

  return (
    <ChartFrame
      id={id}
      title={title}
      subtitle={subtitle}
      empty={data.every((p) => p.value <= 0)}
      emptyText={emptyText}
      table={{ columns, rows: data.map((p) => [p.longLabel, formatBRL(p.value)]) }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="h-auto w-full">
        <g transform={`translate(${LEFT} ${TOP})`}>
          {grid.map((t) => {
            const y = PLOT_H - (t / max) * PLOT_H;
            return (
              <g key={t}>
                <line x1={0} x2={PLOT_W} y1={y} y2={y} stroke="var(--line)" strokeWidth={1} />
                <text x={-8} y={y + 4} textAnchor="end" fontSize={10} fill="var(--muted-strong)">
                  {formatBRLCompact(t)}
                </text>
              </g>
            );
          })}
          <path d={area} fill={color} opacity={0.12} />
          <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => {
            const datum = data[i]!;
            return (
              <g key={datum.label + i}>
                <title>{`${datum.longLabel}: ${formatBRL(datum.value)}`}</title>
                {/* alvo de hover maior que a marca */}
                <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
                <text x={p.x} y={PLOT_H + 16} textAnchor="middle" fontSize={11} fill="var(--muted-strong)">
                  {datum.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </ChartFrame>
  );
}
