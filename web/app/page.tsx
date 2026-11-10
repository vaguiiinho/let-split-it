import Link from 'next/link';
import { CreateGroupForm } from '@/features/groups/CreateGroupForm';
import { api } from '@/lib/api';
import { formatBRL } from '@/lib/money';
import { createGroupAction } from './actions';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async function HomePage() {
  const groups = await api.listGroups();

  return (
    <div className="space-y-8">
      <section aria-labelledby="hero-title" className="pt-2">
        <h1 id="hero-title" className="text-3xl leading-tight font-black sm:text-4xl">
          Quem deve quanto{' '}
          <span className="relative inline-block whitespace-nowrap">
            <span className="relative z-10">pra quem?</span>
            <span aria-hidden className="absolute inset-x-0 bottom-1 -z-0 h-3 -rotate-1 rounded bg-accent/70" />
          </span>
        </h1>
        <p className="mt-2 max-w-prose text-muted">
          Crie o rolê, lance as despesas e a gente calcula o menor número de PIX pra zerar todo mundo.
        </p>
      </section>

      <section aria-labelledby="novo-role" className="card">
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
          <div className="card text-center">
            <p aria-hidden className="text-5xl">
              🏖️
            </p>
            <p className="mt-3 text-lg font-extrabold">Nenhum rolê por aqui ainda</p>
            <p className="mt-1 text-muted">
              Churrasco, viagem, república, pizza de sexta… cria o primeiro aí em cima e acaba com a planilha.
            </p>
          </div>
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
                  <p className="mt-1 text-sm text-muted">
                    {plural(g.memberCount, 'pessoa', 'pessoas')} · {plural(g.expenseCount, 'despesa', 'despesas')}
                  </p>
                  <p className="mt-1 text-xs text-muted">criado em {dateFmt.format(new Date(g.createdAt))}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
