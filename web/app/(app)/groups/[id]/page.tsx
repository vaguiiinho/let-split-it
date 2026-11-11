import Link from 'next/link';
import { BalanceList } from '@/features/settlement/BalanceList';
import { SectionTitle } from '@/features/ui/SectionTitle';
import { StatTile } from '@/features/ui/StatTile';
import { formatBRL } from '@/lib/money';
import { loadGroupOr404, loadSettlementOr404 } from '@/lib/queries';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

/** Visão geral: KPIs do rolê, saldos e atalho para o acerto. */
export default async function GroupOverviewPage({ params }: Props) {
  const { id } = await params;
  const [group, settlement] = await Promise.all([loadGroupOr404(id), loadSettlementOr404(id)]);
  const base = `/groups/${group.id}`;
  const pendingCents = settlement.transfers.reduce((sum, t) => sum + t.amountCents, 0);
  const paidCents = group.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const hasActivity = group.expenses.length > 0 || group.payments.length > 0;

  return (
    <div className="space-y-6">
      <section aria-labelledby="resumo">
        <h2 id="resumo" className="sr-only">
          Resumo do rolê
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile emoji="💸" label="Gasto" value={formatBRL(group.totalCents)} />
          <StatTile emoji="🧾" label="Despesas" value={String(group.expenses.length)} />
          <StatTile emoji="⏳" label="Pendente" value={formatBRL(pendingCents)} tone={pendingCents > 0 ? 'neg' : 'default'} />
          <StatTile emoji="✅" label="Já pago" value={formatBRL(paidCents)} tone={paidCents > 0 ? 'pos' : 'default'} />
        </dl>
      </section>

      <section aria-labelledby="saldos" className="card">
        <SectionTitle
          id="saldos"
          emoji="⚖️"
          aside={
            hasActivity ? (
              <Link href={`${base}/settlement`} className="btn btn-primary text-sm">
                🤝 Ver acerto
              </Link>
            ) : undefined
          }
        >
          Saldos
        </SectionTitle>
        {group.members.length === 0 ? (
          <div className="rounded-xl bg-surface-2 p-3 text-sm">
            Ninguém na roda ainda.{' '}
            <Link href={`${base}/members`} className="font-bold text-link underline underline-offset-2">
              Adicione a galera
            </Link>{' '}
            pra começar.
          </div>
        ) : !hasActivity ? (
          <div className="rounded-xl bg-surface-2 p-3 text-sm">
            Sem despesas, sem dívidas.{' '}
            <Link href={`${base}/expenses`} className="font-bold text-link underline underline-offset-2">
              Lance a primeira despesa
            </Link>{' '}
            🍻
          </div>
        ) : (
          <>
            <BalanceList balances={settlement.balances} />
            {settlement.transfers.length === 0 && (
              <p className="mt-4 rounded-xl border-2 border-pos bg-pos-soft p-3 font-bold text-pos">
                ✅ Tudo quitado! Ninguém deve nada pra ninguém.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
