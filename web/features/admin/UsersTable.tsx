import { dateFmt } from '@/lib/format';
import type { User } from '@/lib/types';

function Badge({ children, tone }: { children: React.ReactNode; tone: 'accent' | 'muted' }) {
  const cls = tone === 'accent' ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted-strong';
  return (
    <span className={`inline-flex rounded-md border-2 border-line px-1.5 text-[0.7rem] font-black uppercase ${cls}`}>
      {children}
    </span>
  );
}

/** Tabela de usuários (rola na horizontal no celular). Papel e "demo" sempre em texto, não só cor. */
export function UsersTable({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="sr-only">Usuários cadastrados ({users.length})</caption>
        <thead>
          <tr className="border-b-2 border-line text-xs text-muted-strong">
            <th scope="col" className="py-2 pr-3 font-bold text-muted-strong">
              Usuário
            </th>
            <th scope="col" className="py-2 pr-3 font-bold text-muted-strong">
              Nome
            </th>
            <th scope="col" className="py-2 pr-3 font-bold text-muted-strong">
              Papel
            </th>
            <th scope="col" className="py-2 font-bold text-muted-strong">
              Criado em
            </th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-line/40">
          {users.map((u) => (
            <tr key={u.id}>
              <th scope="row" className="py-2.5 pr-3 font-mono font-bold">
                <span className="flex flex-wrap items-center gap-1.5">
                  @{u.username}
                  {u.isDemo && <Badge tone="muted">demo</Badge>}
                  {u.id === currentUserId && <span className="font-sans text-xs font-normal text-muted-strong">(você)</span>}
                </span>
              </th>
              <td className="py-2.5 pr-3 break-words">{u.name}</td>
              <td className="py-2.5 pr-3">
                {u.role === 'ADMIN' ? <Badge tone="accent">admin</Badge> : <span className="text-muted-strong">usuário</span>}
              </td>
              <td className="py-2.5 whitespace-nowrap text-muted-strong">
                <time dateTime={u.createdAt}>{dateFmt.format(new Date(u.createdAt))}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
