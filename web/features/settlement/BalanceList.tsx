import { formatBRL } from '@/lib/money';
import type { Balance } from '@/lib/types';

/** Saldos: verde "recebe" / vermelho "deve" / neutro "zerado" — cor, texto e sinal. */
export function BalanceList({ balances }: { balances: Balance[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {balances.map((b) => {
        const tone =
          b.balanceCents > 0
            ? 'border-pos bg-pos-soft text-pos'
            : b.balanceCents < 0
              ? 'border-neg bg-neg-soft text-neg'
              : 'border-line/30 bg-surface-2 text-muted';
        const label = b.balanceCents > 0 ? 'recebe' : b.balanceCents < 0 ? 'deve' : 'zerado';
        return (
          <li key={b.memberId} className={`rounded-xl border-2 px-3 py-2 ${tone}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold text-ink">{b.name}</span>
              <span className="font-black tabular-nums">
                {b.balanceCents > 0 ? '+' : b.balanceCents < 0 ? '−' : ''}
                {formatBRL(Math.abs(b.balanceCents))}
              </span>
            </div>
            <p className="text-xs">
              <span className="font-bold">{label}</span>
              <span className="text-ink/80">
                {' '}
                · pagou {formatBRL(b.paidCents)} · consumiu {formatBRL(b.owedCents)}
                {b.sentCents > 0 && ` · enviou ${formatBRL(b.sentCents)}`}
                {b.receivedCents > 0 && ` · recebeu ${formatBRL(b.receivedCents)}`}
              </span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
