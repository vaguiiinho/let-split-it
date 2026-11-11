import type { Metadata } from 'next';
import Link from 'next/link';
import { CreateGroupForm } from '@/features/groups/CreateGroupForm';
import { EmptyState } from '@/features/ui/EmptyState';
import { PageHeader } from '@/features/ui/PageHeader';
import { api } from '@/lib/api';
import { dateFmt, plural } from '@/lib/format';
import { formatBRL } from '@/lib/money';
import { createGroupAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rolês' };

export default async function GroupsPage() {
  const groups = await api.listGroups();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rolês"
        description="Crie o rolê, lance as despesas e a gente calcula o menor número de PIX pra zerar todo mundo."
      />

      <section id="novo" aria-labelledby="novo-role" className="card">
        <h2 id="novo-role" className="mb-3 text-lg font-extrabold">
          ✨ Novo rolê
        </h2>
        <CreateGroupForm action={createGroupAction} />
      </section>

      <section aria-labelledby="seus-roles">
        <h2 id="seus-roles" className="mb-3 text-lg font-extrabold">
          Seus rolês {groups.length > 0 && <span className="text-muted">({groups.length})</span>}
        </h2>

        {groups.length === 0 ? (
          <EmptyState emoji="🏖️" title="Nenhum rolê por aqui ainda">
            Churrasco, viagem, república, pizza de sexta… cria o primeiro aí em cima e acaba com a planilha.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="card block h-full transition-transform hover:-translate-y-0.5 hover:-rotate-[0.4deg]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-extrabold break-words">{g.name}</h3>
                    <span aria-hidden className="text-xl">
                      →
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-black tabular-nums">{formatBRL(g.totalCents)}</p>
                  <p className="mt-1 text-sm">
                    {plural(g.memberCount, 'pessoa', 'pessoas')} · {plural(g.expenseCount, 'despesa', 'despesas')}
                  </p>
                  <p className="mt-1 text-xs text-muted-strong">criado em {dateFmt.format(new Date(g.createdAt))}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
