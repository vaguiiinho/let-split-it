import type { Metadata } from 'next';
import Link from 'next/link';
import { ExpenseForm } from '@/features/expenses/ExpenseForm';
import { ActionButton } from '@/features/ui/ActionButton';
import { SectionTitle } from '@/features/ui/SectionTitle';
import { timeFmt } from '@/lib/format';
import { formatBRL } from '@/lib/money';
import { groupTitle, loadGroupOr404 } from '@/lib/queries';
import { addExpenseAction, removeExpenseAction } from '../actions';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return groupTitle((await params).id, 'Despesas');
}

export default async function GroupExpensesPage({ params }: Props) {
  const { id } = await params;
  const group = await loadGroupOr404(id);
  const names = new Map(group.members.map((m) => [m.id, m.name]));
  const nameOf = (memberId: string) => names.get(memberId) ?? '?';

  return (
    <div className="space-y-6">
      <section aria-labelledby="nova-despesa" className="card">
        <SectionTitle id="nova-despesa" emoji="💸">
          Nova despesa
        </SectionTitle>
        {group.members.length === 0 ? (
          <p className="rounded-xl bg-surface-2 p-3 text-sm">
            Adicione pelo menos uma pessoa pra lançar despesas.{' '}
            <Link href={`/groups/${group.id}/members`} className="font-bold text-link underline underline-offset-2">
              Ir para Pessoas
            </Link>
          </p>
        ) : (
          <ExpenseForm action={addExpenseAction} groupId={group.id} members={group.members} />
        )}
      </section>

      <section aria-labelledby="despesas" className="card">
        <SectionTitle id="despesas" emoji="🧾">
          Despesas {group.expenses.length > 0 && <span className="text-muted">({group.expenses.length})</span>}
        </SectionTitle>
        {group.expenses.length === 0 ? (
          <p className="rounded-xl bg-surface-2 p-3 text-sm">Nenhuma despesa lançada ainda. A primeira rodada é de quem? 🍻</p>
        ) : (
          <ul className="space-y-3">
            {group.expenses.map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-xl border-2 border-line/25 bg-surface-2/60 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="font-bold break-words text-ink">{e.description}</p>
                    <p className="font-black tabular-nums">{formatBRL(e.amountCents)}</p>
                  </div>
                  <p className="text-sm">
                    <strong>{nameOf(e.payerId)}</strong> pagou ·{' '}
                    <time dateTime={e.createdAt}>{timeFmt.format(new Date(e.createdAt))}</time>
                  </p>
                  <p className="mt-1 text-sm">
                    Dividido entre:{' '}
                    {e.participants
                      .map((p) => `${nameOf(p.memberId)}${p.weight > 1 ? ` (×${p.weight})` : ''} ${formatBRL(p.shareCents)}`)
                      .join(' · ')}
                  </p>
                </div>
                <ActionButton
                  action={removeExpenseAction}
                  fields={{ groupId: group.id, expenseId: e.id }}
                  label={`Remover despesa ${e.description}`}
                >
                  ✕
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
