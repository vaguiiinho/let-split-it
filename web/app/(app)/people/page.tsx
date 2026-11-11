import type { Metadata } from 'next';
import Link from 'next/link';
import { PersonCard } from '@/features/people/PersonCard';
import { EmptyState } from '@/features/ui/EmptyState';
import { PageHeader } from '@/features/ui/PageHeader';
import { listPeople } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pessoas' };

export default async function PeoplePage() {
  const people = await listPeople();

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <>
            Pessoas {people.length > 0 && <span className="text-muted">({people.length})</span>}
          </>
        }
        description="A galera cadastrada uma vez e reaproveitada em qualquer rolê."
        actions={
          <Link href="/people/new" className="btn btn-primary">
            + Nova pessoa
          </Link>
        }
      />

      {people.length === 0 ? (
        <EmptyState
          emoji="🙋"
          title="Ninguém cadastrado ainda"
          action={
            <Link href="/people/new" className="btn btn-primary">
              + Cadastrar a primeira pessoa
            </Link>
          }
        >
          Cadastre a galera uma vez (com chave PIX, de preferência) e use em todos os rolês.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {people.map((p) => (
            <li key={p.id}>
              <PersonCard person={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
