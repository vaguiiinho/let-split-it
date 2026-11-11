import { describe, expect, it } from 'vitest';
import { barLayout, donutArcs, linePath, monthLabel, niceMax, ticks } from './charts';

const hasNaN = (s: string) => /NaN|Infinity/.test(s);

describe('niceMax', () => {
  it('nunca devolve 0 (sem divisão por zero)', () => {
    expect(niceMax(0)).toBeGreaterThan(0);
    expect(niceMax(-5)).toBeGreaterThan(0);
    expect(niceMax(Number.NaN)).toBeGreaterThan(0);
  });

  it('arredonda para cima em degraus 1/2/2,5/5/10', () => {
    expect(niceMax(1)).toBe(1);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(12)).toBe(20);
    expect(niceMax(2100)).toBe(2500);
    expect(niceMax(4100)).toBe(5000);
    expect(niceMax(12000)).toBe(20000);
  });
});

describe('ticks', () => {
  it('vai de 0 até niceMax em partes iguais', () => {
    expect(ticks(9000, 4)).toEqual([0, 2500, 5000, 7500, 10000]);
  });
});

describe('barLayout', () => {
  it('a maior barra ocupa a proporção valor/niceMax da largura', () => {
    const { bars, max } = barLayout(
      [
        { label: 'A', value: 8000 },
        { label: 'B', value: 4000 },
      ],
      { width: 300 },
    );
    expect(max).toBe(10000);
    expect(bars[0]!.width).toBe(240);
    expect(bars[1]!.width).toBe(120);
    expect(bars[1]!.y).toBeGreaterThan(bars[0]!.y);
  });

  it('valor zero tem largura 0 e lista vazia tem altura 0', () => {
    expect(barLayout([{ label: 'Z', value: 0 }]).bars[0]!.width).toBe(0);
    expect(barLayout([]).height).toBe(0);
  });
});

describe('donutArcs', () => {
  it('omite fatia zerada e não gera NaN', () => {
    const arcs = donutArcs([0, 500, 1500]);
    expect(arcs).toHaveLength(2);
    expect(arcs.map((a) => a.index)).toEqual([1, 2]);
    for (const a of arcs) expect(hasNaN(a.d)).toBe(false);
    expect(arcs[0]!.fraction + arcs[1]!.fraction).toBeCloseTo(1);
  });

  it('100% numa fatia gera um anel completo', () => {
    const arcs = donutArcs([0, 3500], { cx: 80, cy: 80, r: 72, inner: 46 });
    expect(arcs).toHaveLength(1);
    expect(arcs[0]!.fraction).toBe(1);
    // dois arcos por raio: externo e interno
    expect(arcs[0]!.d.match(/A 72 72/g)).toHaveLength(2);
    expect(arcs[0]!.d.match(/A 46 46/g)).toHaveLength(2);
    expect(hasNaN(arcs[0]!.d)).toBe(false);
  });

  it('tudo zerado não gera fatias', () => {
    expect(donutArcs([0, 0])).toEqual([]);
  });

  it('fatia maior que meia volta usa large-arc = 1', () => {
    const [big] = donutArcs([3, 1]);
    expect(big!.d).toMatch(/A 72 72 0 1 1/);
  });
});

describe('linePath', () => {
  it('6 pontos geram um d começando em M', () => {
    const { d, points, area } = linePath([0, 1000, 0, 2500, 400, 0], { width: 300, height: 150 });
    expect(points).toHaveLength(6);
    expect(d.startsWith('M')).toBe(true);
    expect(d.match(/L/g)).toHaveLength(5);
    expect(area.endsWith('Z')).toBe(true);
    expect(points[0]!.x).toBe(0);
    expect(points[5]!.x).toBe(300);
    expect(hasNaN(d)).toBe(false);
  });

  it('série toda zerada fica no chão, sem NaN', () => {
    const { points, d } = linePath([0, 0, 0], { height: 100 });
    expect(points.every((p) => p.y === 100)).toBe(true);
    expect(hasNaN(d)).toBe(false);
  });

  it('sem pontos → paths vazios', () => {
    expect(linePath([]).d).toBe('');
  });
});

describe('monthLabel', () => {
  it('formata a chave YYYY-MM em pt-BR', () => {
    expect(monthLabel('2026-06')).toBe('jun');
    expect(monthLabel('2026-11', 'long')).toBe('novembro de 2026');
    expect(monthLabel('xx')).toBe('xx');
  });
});
