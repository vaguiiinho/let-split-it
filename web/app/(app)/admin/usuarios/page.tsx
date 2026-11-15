import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CreateUserForm } from '@/features/admin/CreateUserForm';
import { PurgeDemoButton } from '@/features/admin/PurgeDemoButton';
import { UsersTable } from '@/features/admin/UsersTable';
import { PageHeader } from '@/features/ui/PageHeader';
import { SectionTitle } from '@/features/ui/SectionTitle';
import { api } from '@/lib/api';
import { getMe } from '@/lib/queries';
import { createUserAction, purgeDemoDataAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Usuários' };

/** Só ADMIN. Para os demais a rota "não existe" (não revela a área de admin). */
export default async function AdminUsersPage() {
  const me = await getMe();
  if (me.role !== 'ADMIN') notFound();
  const users = await api.listUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            Usuários <span className="text-muted">({users.length})</span>
          </>
        }
        description="Quem pode entrar no Racha Aí. Só administradores veem esta página."
      />

      <section aria-labelledby="lista-usuarios" className="card">
        <SectionTitle id="lista-usuarios" emoji="🛡️">
          Contas
        </SectionTitle>
        <UsersTable users={users} currentUserId={me.id} />
      </section>

      <section aria-labelledby="novo-usuario" className="card">
        <SectionTitle id="novo-usuario" emoji="➕">
          Criar usuário
        </SectionTitle>
        <CreateUserForm action={createUserAction} />
      </section>

      <section aria-labelledby="demo" className="card border-neg">
        <SectionTitle id="demo" emoji="🧪">
          Dados de demonstração
        </SectionTitle>
        <p className="mb-4">
          Apaga os rolês das contas demo (com despesas, pagamentos e convites) e as pessoas que elas criaram e não estão em
          outros rolês. As contas demo continuam funcionando, e rolês de outras pessoas nunca são apagados.
        </p>
        <PurgeDemoButton action={purgeDemoDataAction} />
      </section>
    </div>
  );
}
