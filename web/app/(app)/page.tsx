import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart } from '@/features/charts/BarChart';
import { DonutChart } from '@/features/charts/DonutChart';
import { LineChart } from '@/features/charts/LineChart';
import { EmptyState } from '@/features/ui/EmptyState';
import { PageHeader } from '@/features/ui/PageHeader';
import { StatTile } from '@/features/ui/StatTile';
import { api } from '@/lib/api';
import { monthLabel } from '@/lib/charts';
import { plural } from '@/lib/format';
import { formatBRL } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { totals, groupsByStatus, byGroup, topPayers, byMonth } = await api.getDashboard();

  const header = (
    <PageHeader
      title="Dashboard"
      description="O resumo de todos os rolês: quanto rolou, quanto já foi acertado e quem segurou a conta."
    />
  );

  if (totals.groupCount === 0) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          emoji="📊"
          title="Ainda não tem nada pra mostrar"
          action={
            <Link href="/groups#novo" className="btn btn-primary">
              ✨ Criar o primeiro rolê
            </Link>
          }
        >
          Os gráficos aparecem assim que o primeiro rolê tiver despesas. Bora começar?
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      <section aria-labelledby="kpis">
        <h2 id="kpis" className="sr-only">
          Números gerais
        </h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile emoji="💸" label="Gasto total" value={formatBRL(totals.spentCents)} hint={plural(totals.expenseCount, 'despesa', 'despesas')} />
          <StatTile emoji="⏳" label="Pendente" value={formatBRL(totals.pendingCents)} tone={totals.pendingCents > 0 ? 'neg' : 'default'} />
          <StatTile emoji="✅" label="Quitado" value={formatBRL(totals.settledCents)} tone={totals.settledCents > 0 ? 'pos' : 'default'} />
          <StatTile
            emoji="🎉"
            label="Rolês"
            value={String(totals.groupCount)}
            hint={`${groupsByStatus.pending} pendente(s) · ${groupsByStatus.settled} quitado(s) · ${groupsByStatus.empty} sem gasto`}
          />
          <StatTile emoji="🙋" label="Pessoas" value={String(totals.peopleCount)} />
        </dl>
      </section>

      <section aria-labelledby="graficos" className="space-y-4">
        <h2 id="graficos" className="text-xl font-black">
          Gráficos
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <DonutChart
            id="chart-acerto"
            title="Pendente × Quitado"
            subtitle="Quanto falta transferir e quanto já foi pago"
            slices={[
              { label: 'Pendente', value: totals.pendingCents, color: 'var(--chart-3)' },
              { label: 'Quitado', value: totals.settledCents, color: 'var(--chart-1)' },
            ]}
            emptyText="Nenhuma dívida e nenhum pagamento ainda. Paz total. 🕊️"
          />
          <LineChart
            id="chart-meses"
            title="Gastos por mês"
            subtitle="Últimos 6 meses"
            data={byMonth.map((m) => ({ label: monthLabel(m.month), longLabel: monthLabel(m.month, 'long'), value: m.totalCents }))}
            columns={['Mês', 'Gasto']}
            emptyText="Nenhum gasto nos últimos 6 meses. Tá economizando, hein? 🐷"
          />
          <BarChart
            id="chart-roles"
            title="Gasto por rolê"
            subtitle="Os rolês que mais custaram"
            data={byGroup.map((g) => ({ label: g.name, value: g.totalCents }))}
            columns={['Rolê', 'Total']}
            emptyText="Nenhum rolê com despesa ainda. Lança a primeira! 🧾"
          />
          <BarChart
            id="chart-pagadores"
            title="Quem mais pagou"
            subtitle="Soma das despesas pagas em todos os rolês"
            data={topPayers.map((p) => ({ label: p.name, value: p.paidCents }))}
            color="var(--chart-5)"
            columns={['Pessoa', 'Pagou']}
            emptyText="Ninguém pagou nada ainda. Quem vai abrir a carteira? 💳"
          />
        </div>
      </section>
    </div>
  );
}
