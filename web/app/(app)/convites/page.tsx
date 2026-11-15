import type { Metadata } from 'next';
import Link from 'next/link';
import { InviteCard } from '@/features/invites/InviteCard';
import { EmptyState } from '@/features/ui/EmptyState';
import { PageHeader } from '@/features/ui/PageHeader';
import { api } from '@/lib/api';
import { acceptInviteAction, declineInviteAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Convites' };

export default async function InvitesPage() {
  const invites = await api.listMyInvites();

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <>
            Convites {invites.length > 0 && <span className="text-muted">({invites.length})</span>}
          </>
        }
        description="Rolês para os quais a galera te chamou. Aceite para entrar e dividir as contas."
      />
      {invites.length === 0 ? (
        <EmptyState
          emoji="📭"
          title="Nenhum convite por aqui"
          action={
            <Link href="/groups" className="btn btn-primary">
              Ver meus rolês
            </Link>
          }
        >
          Quando alguém te chamar pra um rolê, o convite aparece aqui.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {invites.map((invite) => (
            <li key={invite.id}>
              <InviteCard invite={invite} acceptAction={acceptInviteAction} declineAction={declineInviteAction} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
