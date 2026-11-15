import { PersonAvatar } from '@/features/people/PersonAvatar';
import { ActionButton } from '@/features/ui/ActionButton';
import type { FormAction } from '@/features/ui/useFormAction';
import { dateFmt } from '@/lib/format';
import type { ReceivedInvite } from '@/lib/types';

/** Convite recebido: quem chamou, para qual rolê e os botões Aceitar / Recusar. */
export function InviteCard({
  invite,
  acceptAction,
  declineAction,
}: {
  invite: ReceivedInvite;
  acceptAction: FormAction;
  declineAction: FormAction;
}) {
  const titleId = `convite-${invite.id}`;
  return (
    <article aria-labelledby={titleId} className="card">
      <div className="flex items-start gap-3">
        <PersonAvatar name={invite.inviter.name} />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-lg font-black break-words">
            {invite.group.name}
          </h2>
          <p className="text-sm">
            <strong>{invite.inviter.name}</strong> <span className="text-muted-strong">(@{invite.inviter.username})</span> te
            chamou pro rolê.
          </p>
          <p className="mt-0.5 text-xs text-muted-strong">
            Enviado em <time dateTime={invite.createdAt}>{dateFmt.format(new Date(invite.createdAt))}</time>
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ActionButton
          action={acceptAction}
          fields={{ inviteId: invite.id }}
          label={`Aceitar convite para ${invite.group.name}`}
          pendingLabel="Aceitando…"
          className="btn btn-primary"
        >
          ✅ Aceitar
        </ActionButton>
        <ActionButton
          action={declineAction}
          fields={{ inviteId: invite.id }}
          label={`Recusar convite para ${invite.group.name}`}
          pendingLabel="Recusando…"
          className="btn btn-ghost"
          confirmMessage={`Recusar o convite para "${invite.group.name}"?`}
        >
          Recusar
        </ActionButton>
      </div>
    </article>
  );
}
