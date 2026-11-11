const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como moeda brasileira: 123456 → "R$ 1.234,56". */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/**
 * Converte texto digitado em centavos (inteiro). Aceita "12,34", "1.234,56", "12.5",
 * "R$ 10", "1,234.56". Retorna null quando não for um valor válido e não negativo
 * com no máximo 2 casas decimais.
 */
export function parseMoneyToCents(input: string): number | null {
  if (typeof input !== 'string') return null;
  const s = input.replace(/R\$/gi, '').replace(/[\s ]/g, '');
  if (!s || !/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let intPart: string;
  let fracPart = '';

  if (lastComma >= 0 && lastDot >= 0) {
    // Os dois aparecem: o último é o separador decimal; o outro, de milhar.
    const decSep = lastComma > lastDot ? ',' : '.';
    const thouSep = decSep === ',' ? '.' : ',';
    const idx = s.lastIndexOf(decSep);
    const head = s.slice(0, idx);
    fracPart = s.slice(idx + 1);
    if (head.includes(decSep) || !isGrouped(head, thouSep)) return null;
    intPart = head.split(thouSep).join('');
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.';
    const parts = s.split(sep);
    const last = parts[parts.length - 1] ?? '';
    if (parts.length === 2 && last.length <= 2) {
      // Separador decimal: "12,34", "12.5", "10,".
      intPart = parts[0] ?? '';
      fracPart = last;
    } else if (sep === '.' && isGrouped(s, '.')) {
      // Ponto como milhar: "1.234", "1.234.567".
      intPart = parts.join('');
    } else {
      return null;
    }
  } else {
    intPart = s;
  }

  if (fracPart.length > 2 || !/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) return null;
  if (!intPart && !fracPart) return null;

  const cents = Number(intPart || '0') * 100 + Number(fracPart.padEnd(2, '0') || '0');
  return Number.isSafeInteger(cents) ? cents : null;
}

/** "1.234.567" com grupos de 3 dígitos após o primeiro (1–3 dígitos). */
function isGrouped(value: string, sep: string): boolean {
  if (!value.includes(sep)) return /^\d+$/.test(value);
  const groups = value.split(sep);
  const [first, ...rest] = groups;
  return !!first && /^\d{1,3}$/.test(first) && rest.every((g) => /^\d{3}$/.test(g));
}

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Formato curto para eixos de gráfico: 250000 → "R$ 2,5 mil". */
export function formatBRLCompact(cents: number): string {
  return brlCompact.format(cents / 100);
}
