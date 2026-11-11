import type { Metadata } from 'next';
import Link from 'next/link';
import { PersonAvatar } from '@/features/people/PersonAvatar';
import { ActionButton } from '@/features/ui/ActionButton';
import { PageHeader } from '@/features/ui/PageHeader';
import { SectionTitle } from '@/features/ui/SectionTitle';
import { dateFmt, plural } from '@/lib/format';
import { formatBRL } from '@/lib/money';
import { getPerson, loadPersonOr404 } from '@/lib/queries';
import { deletePersonAction } from '../actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    return { title: (await getPerson((await params).id)).name };
  } catch {
    return { title: 'Pessoa' };
  }
}

export default async function PersonPage({ params }: Props) {
  const { id } = await params;
  const person = await loadPersonOr404(id);
  const inGroups = person.groups.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/people', label: 'Pessoas' }}
        title={
          <span className="flex items-center gap-3">
            <PersonAvatar name={person.name} size="lg" />
            <span className="min-w-0 break-words">{person.name}</span>
          </span>
        }
        actions={
          <Link href={`/people/${person.id}/edit`} className="btn btn-ghost text-sm">
            ✏️ Editar
          </Link>
        }
      />

      <section aria-labelledby="dados" className="card">
        <SectionTitle id="dados" emoji="🪪">
          Dados
        </SectionTitle>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm">Chave PIX</dt>
            <dd className="font-bold break-all text-ink">{person.pixKey ?? 'sem chave PIX'}</dd>
          </div>
          <div>
            <dt className="text-sm">Cadastrada em</dt>
            <dd className="font-bold text-ink">{dateFmt.format(new Date(person.createdAt))}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="roles-da-pessoa" className="card">
        <SectionTitle id="roles-da-pessoa" emoji="🎉">
          Rolês {inGroups && <span className="text-muted">({person.groups.length})</span>}
        </SectionTitle>
        {!inGroups ? (
          <p className="rounded-xl bg-surface-2 p-3 text-sm">Ainda não participa de nenhum rolê. Adicione pela aba Pessoas de um rolê. 🎈</p>
        ) : (
          <ul className="space-y-2">
            {person.groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-xl border-2 border-line/60 bg-surface-2/60 p-3 hover:border-line hover:bg-surface-2"
                >
                  <span className="font-bold break-words text-ink">{g.name}</span>
                  <span className="font-black tabular-nums">{formatBRL(g.totalCents)}</span>
                  <span className="basis-full text-xs text-muted-strong">
                    {plural(g.memberCount, 'pessoa', 'pessoas')} · criado em {dateFmt.format(new Date(g.createdAt))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="perigo" className="card border-neg">
        <SectionTitle id="perigo" emoji="⚠️">
          Zona de perigo
        </SectionTitle>
        <p className="mb-4">
          {inGroups
            ? 'Só dá pra excluir quem não participa de nenhum rolê. Remova a pessoa dos rolês antes.'
            : 'Excluir apaga o cadastro desta pessoa. Não dá pra desfazer.'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton
            action={deletePersonAction}
            fields={{ personId: person.id }}
            label={`Excluir ${person.name}`}
            pendingLabel="Excluindo…"
            className="btn btn-danger"
            confirmMessage={`Excluir "${person.name}"? Não dá pra desfazer.`}
          >
            🗑️ Excluir pessoa
          </ActionButton>
        </div>
      </section>
    </div>
  );
}
