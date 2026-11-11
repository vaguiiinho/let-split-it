// TODO(remover-apos-escolha) — dashboard fictício usado nas sugestões de layout.
import { formatBRL } from '@/lib/money';
import { SAMPLE_BY_GROUP, SAMPLE_GROUPS, SAMPLE_PEOPLE, SAMPLE_TOTALS } from './sample-data';

const KPIS = [
  { label: 'Gasto total', value: formatBRL(SAMPLE_TOTALS.spentCents), emoji: '💸' },
  { label: 'Pendente', value: formatBRL(SAMPLE_TOTALS.pendingCents), emoji: '⏳' },
  { label: 'Quitado', value: formatBRL(SAMPLE_TOTALS.settledCents), emoji: '✅' },
  { label: 'Rolês', value: String(SAMPLE_TOTALS.groupCount), emoji: '🎉' },
  { label: 'Pessoas', value: String(SAMPLE_TOTALS.peopleCount), emoji: '🙋' },
];

export function SampleDashboard({ title = 'Dashboard' }: { title?: string }) {
  const max = Math.max(...SAMPLE_BY_GROUP.map((g) => g.totalCents));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">{title}</h1>
        <p className="mt-1">Dados fictícios só para comparar o layout.</p>
      </div>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {KPIS.map((k) => (
          <li key={k.label} className="card p-4 sm:p-4">
            <p className="text-sm font-bold text-muted-strong">
              <span aria-hidden>{k.emoji}</span> {k.label}
            </p>
            <p className="mt-1 text-xl font-black tabular-nums">{k.value}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="amostra-por-role" className="card">
          <h2 id="amostra-por-role" className="text-lg font-extrabold">
            Gasto por rolê
          </h2>
          <ul className="mt-4 space-y-3">
            {SAMPLE_BY_GROUP.map((g, i) => (
              <li key={g.name}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{g.name}</span>
                  <span className="tabular-nums">{formatBRL(g.totalCents)}</span>
                </div>
                <div aria-hidden className="mt-1 h-3 rounded-full bg-surface-2">
                  <div
                    className={`h-3 rounded-full ${['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-5'][i % 4]}`}
                    style={{ width: `${Math.round((g.totalCents / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="amostra-pagadores" className="card">
          <h2 id="amostra-pagadores" className="text-lg font-extrabold">
            Quem mais pagou
          </h2>
          <ol className="mt-4 divide-y-2 divide-line">
            {SAMPLE_PEOPLE.map((p, i) => (
              <li key={p.name} className="flex items-center justify-between gap-3 py-2">
                <span className="font-bold text-ink">
                  {i + 1}. {p.name}
                </span>
                <span className="tabular-nums">{formatBRL(p.paidCents)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="amostra-roles">
        <h2 id="amostra-roles" className="mb-3 text-lg font-extrabold">
          Rolês recentes
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {SAMPLE_GROUPS.map((g) => (
            <li key={g.name} className="card p-4 sm:p-4">
              <h3 className="font-extrabold">{g.name}</h3>
              <p className="mt-1 text-sm">{g.people} pessoas</p>
              <p
                className={`mt-2 inline-block rounded-lg px-2 py-0.5 text-xs font-bold ${g.status === 'quitado' ? 'bg-pos-soft text-pos' : 'bg-neg-soft text-neg'}`}
              >
                {g.status === 'quitado' ? '✓ quitado' : '⏳ pendente'}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
