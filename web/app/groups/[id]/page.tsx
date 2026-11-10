import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExpenseForm } from '@/features/expenses/ExpenseForm';
import { AddMemberForm } from '@/features/members/AddMemberForm';
import { TransferCard } from '@/features/settlement/TransferCard';
import { WhatsAppSummaryButton } from '@/features/settlement/WhatsAppSummaryButton';
import { ActionButton } from '@/features/ui/ActionButton';
import { ApiError, api, type GroupDetail, type Settlement } from '@/lib/api';
import { formatBRL } from '@/lib/money';
import { buildWhatsAppSummary } from '@/lib/whatsapp';
import {
  addExpenseAction,
  addMemberAction,
  deleteGroupAction,
  removeExpenseAction,
  removeMemberAction,
} from './actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

async function load(id: string): Promise<{ group: GroupDetail; settlement: Settlement }> {
  try {
    const [group, settlement] = await Promise.all([api.getGroup(id), api.getSettlement(id)]);
    return { group, settlement };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const group = await api.getGroup(id);
    return { title: group.name };
  } catch {
    return { title: 'Rolê' };
  }
}

const timeFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function SectionTitle({ id, emoji, children, aside }: { id: string; emoji: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="flex items-center gap-2 text-xl font-black">
        <span aria-hidden className="grid size-9 place-items-center rounded-lg border-2 border-line bg-surface-2 text-lg">
          {emoji}
        </span>
        {children}
      </h2>
      {aside}
    </div>
  );
}

export default async function GroupPage({ params }: Props) {
  const { id } = await params;
  const { group, settlement } = await load(id);
  const names = new Map(group.members.map((m) => [m.id, m.name]));
  const involved = new Set(group.expenses.flatMap((e) => [e.payerId, ...e.participants.map((p) => p.memberId)]));
  const ids = { groupId: group.id };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="inline-flex items-center gap-1 rounded-lg text-sm font-bold text-muted hover:text-ink">
          ← Todos os rolês
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-black break-words sm:text-4xl">{group.name}</h1>
            <p className="mt-1 text-muted">
              Total gasto: <strong className="text-ink tabular-nums">{formatBRL(group.totalCents)}</strong> ·{' '}
              {group.members.length} {group.members.length === 1 ? 'pessoa' : 'pessoas'}
            </p>
          </div>
          <ActionButton
            action={deleteGroupAction}
            fields={ids}
            label="Excluir rolê"
            pendingLabel="Excluindo rolê…"
            className="btn btn-danger text-sm"
            confirmMessage={`Excluir o rolê "${group.name}"? Isso apaga pessoas e despesas e não dá pra desfazer.`}
          >
            🗑️ Excluir rolê
          </ActionButton>
        </div>
      </div>

      {/* ===== Pessoas ===== */}
      <section aria-labelledby="pessoas" className="card">
        <SectionTitle id="pessoas" emoji="🙋">
          Pessoas
        </SectionTitle>
        {group.members.length === 0 ? (
          <p className="mb-4 rounded-xl bg-surface-2 p-3 text-sm">
            Ninguém na roda ainda. Adiciona a galera — com chave PIX, o acerto já sai com QR Code. 😉
          </p>
        ) : (
          <ul className="mb-5 divide-y-2 divide-line/15">
            {group.members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-2">
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-line bg-accent font-black text-accent-ink"
                >
                  {m.name.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold break-words">{m.name}</p>
                  <p className="truncate text-sm text-muted">{m.pixKey ? `PIX: ${m.pixKey}` : 'sem chave PIX'}</p>
                </div>
                {involved.has(m.id) ? (
                  <span className="text-xs text-muted" title="Tem despesa no nome — remova as despesas antes">
                    🔒 em despesas
                  </span>
                ) : (
                  <ActionButton
                    action={removeMemberAction}
                    fields={{ ...ids, memberId: m.id }}
                    label={`Remover ${m.name}`}
                  >
                    ✕
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
        <AddMemberForm action={addMemberAction} groupId={group.id} />
      </section>

      {/* ===== Despesas ===== */}
      <section aria-labelledby="despesas" className="card">
        <SectionTitle id="despesas" emoji="🧾">
          Despesas
        </SectionTitle>
        {group.members.length === 0 ? (
          <p className="rounded-xl bg-surface-2 p-3 text-sm">Adicione pelo menos uma pessoa pra lançar despesas.</p>
        ) : (
          <ExpenseForm action={addExpenseAction} groupId={group.id} members={group.members} />
        )}

        {group.expenses.length > 0 && (
          <ul className="mt-6 space-y-3">
            {group.expenses.map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-xl border-2 border-line/25 bg-surface-2/60 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="font-bold break-words">{e.description}</p>
                    <p className="font-black tabular-nums">{formatBRL(e.amountCents)}</p>
                  </div>
                  <p className="text-sm text-muted">
                    <strong className="text-ink">{names.get(e.payerId) ?? '?'}</strong> pagou ·{' '}
                    <time dateTime={e.createdAt}>{timeFmt.format(new Date(e.createdAt))}</time>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Dividido entre:{' '}
                    {e.participants
                      .map(
                        (p) =>
                          `${names.get(p.memberId) ?? '?'}${p.weight > 1 ? ` (×${p.weight})` : ''} ${formatBRL(p.shareCents)}`,
                      )
                      .join(' · ')}
                  </p>
                </div>
                <ActionButton
                  action={removeExpenseAction}
                  fields={{ ...ids, expenseId: e.id }}
                  label={`Remover despesa ${e.description}`}
                >
                  ✕
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ===== Acerto ===== */}
      <section aria-labelledby="acerto" className="card">
        <SectionTitle
          id="acerto"
          emoji="🤝"
          aside={
            group.expenses.length > 0 ? (
              <WhatsAppSummaryButton text={buildWhatsAppSummary(group.name, settlement)} />
            ) : undefined
          }
        >
          Acerto
        </SectionTitle>

        {group.expenses.length === 0 ? (
          <p className="rounded-xl bg-surface-2 p-3 text-sm">Sem despesas, sem dívidas. Lança a primeira aí em cima! 🍻</p>
        ) : (
          <>
            <h3 className="mb-2 text-sm font-extrabold tracking-wide text-muted uppercase">Saldos</h3>
            <ul className="mb-6 grid gap-2 sm:grid-cols-2">
              {settlement.balances.map((b) => {
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
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>

            <h3 className="mb-2 text-sm font-extrabold tracking-wide text-muted uppercase">
              Transferências {settlement.transfers.length > 0 && `(${settlement.transfers.length})`}
            </h3>
            {settlement.transfers.length === 0 ? (
              <p className="rounded-xl border-2 border-pos bg-pos-soft p-3 font-bold text-pos">
                ✅ Tudo quitado! Ninguém deve nada pra ninguém.
              </p>
            ) : (
              <ul className="space-y-3">
                {settlement.transfers.map((t) => (
                  <li key={`${t.fromId}-${t.toId}`}>
                    <TransferCard transfer={t} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
