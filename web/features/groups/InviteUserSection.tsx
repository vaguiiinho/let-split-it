import { PersonAvatar } from '@/features/people/PersonAvatar';
import { ActionButton } from '@/features/ui/ActionButton';
import { SectionTitle } from '@/features/ui/SectionTitle';
import type { FormAction } from '@/features/ui/useFormAction';
import { dateFmt } from '@/lib/format';
import type { Invite, UserSearchResult } from '@/lib/types';

export type InviteSearch =
  | { kind: 'idle' }
  | { kind: 'invalid'; q: string; message: string }
  | { kind: 'results'; q: string; results: UserSearchResult[] };

/**
 * "Convidar usuário": busca server-side por GET `?q=` (funciona sem JS), resultados com "Convidar"
 * e a lista "Aguardando resposta". Quem tem conta só entra no rolê aceitando um convite (R7).
 */
export function InviteUserSection({
  groupId,
  search,
  pending,
  inviteAction,
}: {
  groupId: string;
  search: InviteSearch;
  pending: Invite[];
  inviteAction: FormAction;
}) {
  const pendingIds = new Set(pending.map((i) => i.invitee.id));
  const q = search.kind === 'idle' ? '' : search.q;

  return (
    <section aria-labelledby="convidar" className="card space-y-6">
      <div>
        <SectionTitle id="convidar" emoji="📨">
          Convidar usuário
        </SectionTitle>
        <p className="mb-3 text-sm">
          Quem tem conta no Racha Aí entra por convite: a pessoa aceita e o rolê aparece pra ela também.
        </p>
        <form method="get" action={`/groups/${groupId}/members`} role="search" aria-label="Buscar usuários">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label htmlFor="invite-q" className="field-label">
                Usuário ou nome
              </label>
              <input
                id="invite-q"
                name="q"
                type="search"
                defaultValue={q}
                minLength={2}
                maxLength={30}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Ex.: luiz"
                className="input"
                aria-invalid={search.kind === 'invalid'}
                aria-describedby="invite-q-error"
              />
            </div>
            <button type="submit" className="btn btn-ghost">
              🔎 Buscar
            </button>
          </div>
          <div id="invite-q-error" aria-live="polite">
            {search.kind === 'invalid' && (
              <p role="alert" className="alert-error">
                {search.message}
              </p>
            )}
          </div>
        </form>

        {search.kind === 'results' && (
          <div className="mt-4" aria-live="polite">
            <h3 className="sr-only">Resultados para “{search.q}”</h3>
            {search.results.length === 0 ? (
              <p className="rounded-xl bg-surface-2 p-3 text-sm">
                Ninguém encontrado para “{search.q}”. Confira o usuário ou peça pro admin criar a conta. 🤷
              </p>
            ) : (
              <ul className="divide-y-2 divide-line/40">
                {search.results.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center gap-3 py-2">
                    <PersonAvatar name={u.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold break-words text-ink">{u.name}</p>
                      <p className="truncate text-sm">@{u.username}</p>
                    </div>
                    {pendingIds.has(u.id) ? (
                      <span className="text-xs text-muted-strong">⏳ convite pendente</span>
                    ) : (
                      <ActionButton
                        action={inviteAction}
                        fields={{ groupId, userId: u.id }}
                        label={`Convidar ${u.username}`}
                        pendingLabel={`Convidando ${u.username}…`}
                        className="btn btn-primary text-sm"
                      >
                        + Convidar
                      </ActionButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="border-t-2 border-line pt-6">
        <h3 id="aguardando" className="mb-3 font-extrabold">
          Aguardando resposta {pending.length > 0 && <span className="text-muted">({pending.length})</span>}
        </h3>
        {pending.length === 0 ? (
          <p className="rounded-xl bg-surface-2 p-3 text-sm">Nenhum convite pendente neste rolê.</p>
        ) : (
          <ul aria-labelledby="aguardando" className="divide-y-2 divide-line/40">
            {pending.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center gap-3 py-2">
                <PersonAvatar name={invite.invitee.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold break-words text-ink">{invite.invitee.name}</p>
                  <p className="truncate text-sm">@{invite.invitee.username}</p>
                </div>
                <span className="text-xs text-muted-strong">
                  ⏳ desde <time dateTime={invite.createdAt}>{dateFmt.format(new Date(invite.createdAt))}</time>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
