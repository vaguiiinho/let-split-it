// Geometria pura dos gráficos SVG do dashboard (sem DOM, sem dependências). Testada em charts.test.ts.

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Teto "redondo" para a escala (1, 2, 2.5, 5 × 10^n) ≥ max. Nunca devolve 0,
 * para que `valor / niceMax` jamais divida por zero.
 */
export function niceMax(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= max) return candidate;
  }
  return 10 * magnitude;
}

/** Marcas da grade: 0, max/count, …, max. */
export function ticks(max: number, count = 4): number[] {
  const top = niceMax(max);
  return Array.from({ length: count + 1 }, (_, i) => (top / count) * i);
}

export type BarDatum = { label: string; value: number };
export type BarRect = BarDatum & { x: number; y: number; width: number; height: number; labelY: number };

/**
 * Barras horizontais com o rótulo em cima de cada barra (cabe no celular sem texto minúsculo).
 * Valores negativos contam como 0. Barras com valor > 0 têm largura mínima de 2 para aparecerem.
 */
export function barLayout(
  data: BarDatum[],
  { width = 320, barHeight = 12, labelHeight = 20, gap = 14 }: { width?: number; barHeight?: number; labelHeight?: number; gap?: number } = {},
): { max: number; height: number; bars: BarRect[] } {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const row = labelHeight + barHeight + gap;
  const bars = data.map((d, i) => {
    const value = Math.max(0, d.value);
    const w = value > 0 ? Math.max(2, (value / max) * width) : 0;
    const top = i * row;
    return { ...d, x: 0, y: round(top + labelHeight), width: round(w), height: barHeight, labelY: round(top + labelHeight - 6) };
  });
  return { max, height: data.length > 0 ? data.length * row - gap : 0, bars };
}

export type DonutArc = { index: number; value: number; fraction: number; d: string };

const polar = (cx: number, cy: number, r: number, angle: number) =>
  [round(cx + r * Math.cos(angle)), round(cy + r * Math.sin(angle))] as const;

/**
 * Fatias de uma rosca (anel entre `inner` e `r`), começando às 12h no sentido horário.
 * Fatias com valor ≤ 0 são omitidas (nada de path com NaN). Uma fatia com 100% vira um anel
 * completo (dois semicírculos por raio, `fill-rule="evenodd"`).
 */
export function donutArcs(
  values: number[],
  { cx = 80, cy = 80, r = 72, inner = 46 }: { cx?: number; cy?: number; r?: number; inner?: number } = {},
): DonutArc[] {
  const clean = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const total = clean.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];

  const positive = clean.filter((v) => v > 0).length;
  const arcs: DonutArc[] = [];
  let start = -Math.PI / 2;

  clean.forEach((value, index) => {
    if (value <= 0) return;
    const fraction = value / total;
    if (positive === 1) {
      const ring = (rad: number) =>
        `M ${round(cx - rad)} ${cy} A ${rad} ${rad} 0 1 1 ${round(cx + rad)} ${cy} A ${rad} ${rad} 0 1 1 ${round(cx - rad)} ${cy} Z`;
      arcs.push({ index, value, fraction: 1, d: `${ring(r)} ${ring(inner)}` });
      return;
    }
    const end = start + fraction * 2 * Math.PI;
    const large = end - start > Math.PI ? 1 : 0;
    const [x0, y0] = polar(cx, cy, r, start);
    const [x1, y1] = polar(cx, cy, r, end);
    const [x2, y2] = polar(cx, cy, inner, end);
    const [x3, y3] = polar(cx, cy, inner, start);
    arcs.push({
      index,
      value,
      fraction,
      d: `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${inner} ${inner} 0 ${large} 0 ${x3} ${y3} Z`,
    });
    start = end;
  });
  return arcs;
}

export type LinePoint = { x: number; y: number; value: number };

/**
 * Pontos e paths (`d` da linha e da área) de uma série no retângulo de plotagem.
 * Um único ponto fica centralizado. Sem pontos → paths vazios.
 */
export function linePath(
  values: number[],
  { width = 320, height = 160, padX = 0, padTop = 0 }: { width?: number; height?: number; padX?: number; padTop?: number } = {},
): { max: number; points: LinePoint[]; d: string; area: string } {
  const clean = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const max = niceMax(Math.max(0, ...clean));
  const span = width - padX * 2;
  const plotH = height - padTop;
  const points = clean.map((value, i) => ({
    value,
    x: round(clean.length === 1 ? width / 2 : padX + (span * i) / (clean.length - 1)),
    y: round(padTop + plotH - (value / max) * plotH),
  }));
  if (points.length === 0) return { max, points, d: '', area: '' };

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const area = `${d} L ${last.x} ${height} L ${first.x} ${height} Z`;
  return { max, points, d, area };
}

const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const monthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function monthDate(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : null;
}

/** "2026-06" → "jun" (eixo) ou "junho de 2026" (tabela/leitor de tela). */
export function monthLabel(key: string, style: 'short' | 'long' = 'short'): string {
  const date = monthDate(key);
  if (!date) return key;
  return style === 'short' ? monthShort.format(date).replace('.', '') : monthLong.format(date);
}
