import type { Metadata } from 'next';
import Link from 'next/link';
import { AddExistingMemberForm } from '@/features/members/AddExistingMemberForm';
import { AddMemberForm } from '@/features/members/AddMemberForm';
import { PersonAvatar } from '@/features/people/PersonAvatar';
import { ActionButton } from '@/features/ui/ActionButton';
import { SectionTitle } from '@/features/ui/SectionTitle';
import { groupTitle, listPeople, loadGroupOr404 } from '@/lib/queries';
import { addExistingMemberAction, addNewMemberAction, removeMemberAction } from '../actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return groupTitle((await params).id, 'Pessoas');
}

export default async function GroupMembersPage({ params }: Props) {
  const { id } = await params;
  const [group, people] = await Promise.all([loadGroupOr404(id), listPeople()]);
  const memberIds = new Set(group.members.map((m) => m.id));
  const available = people.filter((p) => !memberIds.has(p.id));
  const involved = new Set([
    ...group.expenses.flatMap((e) => [e.payerId, ...e.participants.map((p) => p.memberId)]),
    ...group.payments.flatMap((p) => [p.fromId, p.toId]),
  ]);

  return (
    <div className="space-y-6">
      <section aria-labelledby="participantes" className="card">
        <SectionTitle id="participantes" emoji="🙋">
          Quem está no rolê {group.members.length > 0 && <span className="text-muted">({group.members.length})</span>}
        </SectionTitle>
        {group.members.length === 0 ? (
          <p className="rounded-xl bg-surface-2 p-3 text-sm">
            Ninguém na roda ainda. Adiciona a galera — com chave PIX, o acerto já sai com QR Code. 😉
          </p>
        ) : (
          <ul className="divide-y-2 divide-line/40">
            {group.members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-2">
                <PersonAvatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <Link href={`/people/${m.id}`} className="font-bold break-words text-ink underline-offset-2 hover:underline">
                    {m.name}
                  </Link>
                  <p className="truncate text-sm">{m.pixKey ? `PIX: ${m.pixKey}` : 'sem chave PIX'}</p>
                </div>
                {involved.has(m.id) ? (
                  <span className="text-xs text-muted-strong" title="Tem despesa ou pagamento no nome — remova-os antes">
                    🔒 em despesas/pagamentos
                  </span>
                ) : (
                  <ActionButton
                    action={removeMemberAction}
                    fields={{ groupId: group.id, memberId: m.id }}
                    label={`Remover ${m.name} do rolê`}
                    pendingLabel={`Removendo ${m.name}…`}
                  >
                    ✕
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
        {group.members.length > 0 && (
          <p className="mt-3 text-xs text-muted-strong">Remover do rolê não apaga a pessoa — ela continua em Pessoas.</p>
        )}
      </section>

      <section aria-label="Adicionar pessoas" className="card space-y-6">
        <AddExistingMemberForm action={addExistingMemberAction} groupId={group.id} people={available} />
        <div id="nova-pessoa" className="border-t-2 border-line pt-6">
          <AddMemberForm action={addNewMemberAction} groupId={group.id} />
        </div>
      </section>
    </div>
  );
}
