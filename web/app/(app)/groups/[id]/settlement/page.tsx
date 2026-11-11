import type { Metadata } from 'next';
import Link from 'next/link';
import { TransferCard } from '@/features/settlement/TransferCard';
import { WhatsAppSummaryButton } from '@/features/settlement/WhatsAppSummaryButton';
import { ActionButton } from '@/features/ui/ActionButton';
import { SectionTitle } from '@/features/ui/SectionTitle';
import { timeFmt } from '@/lib/format';
import { formatBRL } from '@/lib/money';
import { groupTitle, loadGroupOr404, loadSettlementOr404 } from '@/lib/queries';
import { buildWhatsAppSummary } from '@/lib/whatsapp';
import { registerPaymentAction, removePaymentAction } from '../actions';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return groupTitle((await params).id, 'Acerto');
}

export default async function GroupSettlementPage({ params }: Props) {
  const { id } = await params;
  const [group, settlement] = await Promise.all([loadGroupOr404(id), loadSettlementOr404(id)]);
  const names = new Map(group.members.map((m) => [m.id, m.name]));
  const nameOf = (memberId: string) => names.get(memberId) ?? '?';
  const hasActivity = group.expenses.length > 0 || group.payments.length > 0;

  if (!hasActivity) {
    return (
      <section aria-labelledby="acerto" className="card">
        <SectionTitle id="acerto" emoji="🤝">
          Acerto
        </SectionTitle>
        <p className="rounded-xl bg-surface-2 p-3 text-sm">
          Sem despesas, sem dívidas.{' '}
          <Link href={`/groups/${group.id}/expenses`} className="font-bold text-link underline underline-offset-2">
            Lance a primeira despesa
          </Link>{' '}
          🍻
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="acerto" className="card">
        <SectionTitle id="acerto" emoji="🤝" aside={<WhatsAppSummaryButton text={buildWhatsAppSummary(group.name, settlement)} />}>
          Transferências {settlement.transfers.length > 0 && <span className="text-muted">({settlement.transfers.length})</span>}
        </SectionTitle>
        {settlement.transfers.length === 0 ? (
          <p className="rounded-xl border-2 border-pos bg-pos-soft p-3 font-bold text-pos">✅ Tudo quitado! Ninguém deve nada pra ninguém.</p>
        ) : (
          <ul className="space-y-3">
            {settlement.transfers.map((t) => (
              // amountCents na key: após um pagamento parcial o valor pré-preenchido é recalculado.
              <li key={`${t.fromId}-${t.toId}-${t.amountCents}`}>
                <TransferCard transfer={t} groupId={group.id} registerAction={registerPaymentAction} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pagamentos" className="card">
        <SectionTitle id="pagamentos" emoji="✅">
          Pagamentos registrados {group.payments.length > 0 && <span className="text-muted">({group.payments.length})</span>}
        </SectionTitle>
        {group.payments.length === 0 ? (
          <p className="rounded-xl bg-surface-2 p-3 text-sm">Nenhum pagamento registrado ainda. Pagou? Registra ali em cima. 💸</p>
        ) : (
          <ul className="space-y-2">
            {group.payments.map((p) => {
              const who = `${nameOf(p.fromId)} para ${nameOf(p.toId)}`;
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border-2 border-pos/40 bg-pos-soft/50 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-bold break-words text-ink">
                        {nameOf(p.fromId)} <span aria-label="pagou para">→</span> {nameOf(p.toId)}
                      </p>
                      <p className="font-black tabular-nums">{formatBRL(p.amountCents)}</p>
                    </div>
                    <p className="text-sm">
                      <time dateTime={p.createdAt}>{timeFmt.format(new Date(p.createdAt))}</time>
                    </p>
                  </div>
                  <ActionButton
                    action={removePaymentAction}
                    fields={{ groupId: group.id, paymentId: p.id }}
                    label={`Desfazer pagamento de ${who}`}
                    pendingLabel="Desfazendo pagamento…"
                    className="btn btn-ghost text-sm"
                  >
                    ↩ Desfazer
                  </ActionButton>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
