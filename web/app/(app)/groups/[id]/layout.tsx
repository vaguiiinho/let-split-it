import type { Metadata } from 'next';
import Link from 'next/link';
import { GroupTabs } from '@/features/groups/GroupTabs';
import { PageHeader } from '@/features/ui/PageHeader';
import { plural } from '@/lib/format';
import { formatBRL } from '@/lib/money';
import { groupTitle, loadGroupOr404 } from '@/lib/queries';

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  return groupTitle((await params).id);
}

/** Cabeçalho do rolê + abas. Compartilha o GET do rolê com as páginas via React.cache. */
export default async function GroupLayout({ params, children }: Props) {
  const { id } = await params;
  const group = await loadGroupOr404(id);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/groups', label: 'Todos os rolês' }}
        title={group.name}
        description={
          <>
            Total gasto: <strong className="tabular-nums">{formatBRL(group.totalCents)}</strong> ·{' '}
            {plural(group.members.length, 'pessoa', 'pessoas')}
          </>
        }
        actions={
          <Link href={`/groups/${group.id}/edit`} className="btn btn-ghost text-sm">
            ✏️ Editar
          </Link>
        }
      />
      <GroupTabs groupId={group.id} />
      {children}
    </div>
  );
}
