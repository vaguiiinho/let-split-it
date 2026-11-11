import type { Metadata } from 'next';
import { EditGroupForm } from '@/features/groups/EditGroupForm';
import { ActionButton } from '@/features/ui/ActionButton';
import { SectionTitle } from '@/features/ui/SectionTitle';
import { groupTitle, loadGroupOr404 } from '@/lib/queries';
import { deleteGroupAction, updateGroupAction } from '../actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return groupTitle((await params).id, 'Editar');
}

export default async function EditGroupPage({ params }: Props) {
  const { id } = await params;
  const group = await loadGroupOr404(id);

  return (
    <div className="space-y-6">
      <section aria-labelledby="editar" className="card">
        <SectionTitle id="editar" emoji="✏️">
          Editar rolê
        </SectionTitle>
        <EditGroupForm action={updateGroupAction} groupId={group.id} name={group.name} />
      </section>

      <section aria-labelledby="perigo" className="card border-neg">
        <SectionTitle id="perigo" emoji="⚠️">
          Zona de perigo
        </SectionTitle>
        <p className="mb-4">
          Excluir o rolê apaga as despesas e os pagamentos dele. As pessoas continuam salvas em Pessoas. Não dá pra desfazer.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton
            action={deleteGroupAction}
            fields={{ groupId: group.id }}
            label="Excluir rolê"
            pendingLabel="Excluindo rolê…"
            className="btn btn-danger"
            confirmMessage={`Excluir o rolê "${group.name}"? Despesas e pagamentos serão apagados e não dá pra desfazer.`}
          >
            🗑️ Excluir rolê
          </ActionButton>
        </div>
      </section>
    </div>
  );
}
