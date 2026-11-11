import { Clock } from '../../../../shared/domain/clock.port';
import { PersonRepository } from '../../../people/domain/person.repository';
import { GroupRepository } from '../../domain/group.repository';
import { DashboardOutput } from '../dto/dashboard.output';

export type GetDashboardInput = Record<string, never>;
export type GetDashboardOutput = DashboardOutput;

const TZ = 'America/Sao_Paulo';
const MONTHS = 6;
const MAX_GROUPS = 8;
const MAX_PAYERS = 5;

/** Formatter reutilizado: criar um por despesa é caro. */
const monthFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit' });

const byNameAsc = (a: string, b: string) => a.localeCompare(b, 'pt-BR');

export class GetDashboardUseCase {
  constructor(
    private readonly groups: GroupRepository,
    private readonly people: PersonRepository,
    private readonly clock: Clock,
  ) {}

  async execute(_input: GetDashboardInput): Promise<GetDashboardOutput> {
    const [groups, peopleCount] = await Promise.all([this.groups.findAll(), this.people.count()]);

    let spentCents = 0;
    let settledCents = 0;
    let pendingCents = 0;
    let expenseCount = 0;
    const status = { settled: 0, pending: 0, empty: 0 };
    const paid = new Map<string, { name: string; cents: number }>();
    const months = this.lastMonths();
    const monthTotals = new Map(months.map((m) => [m, 0]));

    for (const g of groups) {
      spentCents += g.totalCents;
      expenseCount += g.expenses.length;
      settledCents += g.payments.reduce((acc, p) => acc + p.amount.value, 0);
      const pending = g.settle().transfers.reduce((acc, t) => acc + t.amountCents, 0);
      pendingCents += pending;
      if (g.expenses.length === 0) status.empty += 1;
      else if (pending === 0) status.settled += 1;
      else status.pending += 1;

      for (const e of g.expenses) {
        const key = e.payerId.value;
        const name = g.members.find((m) => m.id.equals(e.payerId))?.name.value ?? '';
        const cur = paid.get(key) ?? { name, cents: 0 };
        cur.cents += e.amount.value;
        paid.set(key, cur);
        const month = this.monthKey(e.createdAt);
        if (monthTotals.has(month)) monthTotals.set(month, monthTotals.get(month)! + e.amount.value);
      }
    }

    return {
      totals: {
        spentCents,
        settledCents,
        pendingCents,
        groupCount: groups.length,
        peopleCount,
        expenseCount,
      },
      groupsByStatus: status,
      byGroup: groups
        .filter((g) => g.totalCents > 0)
        .map((g) => ({ groupId: g.id.value, name: g.name.value, totalCents: g.totalCents }))
        .sort((a, b) => b.totalCents - a.totalCents || byNameAsc(a.name, b.name))
        .slice(0, MAX_GROUPS),
      topPayers: [...paid.entries()]
        .map(([personId, v]) => ({ personId, name: v.name, paidCents: v.cents }))
        .filter((p) => p.paidCents > 0)
        .sort((a, b) => b.paidCents - a.paidCents || byNameAsc(a.name, b.name))
        .slice(0, MAX_PAYERS),
      byMonth: months.map((month) => ({ month, totalCents: monthTotals.get(month) ?? 0 })),
    };
  }

  /** Chave YYYY-MM no fuso de São Paulo. */
  private monthKey(date: Date): string {
    const parts = monthFmt.formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)!.value;
    return `${get('year')}-${get('month')}`;
  }

  /** Últimos 6 meses até o atual, do mais antigo ao mais recente. */
  private lastMonths(): string[] {
    const [year, month] = this.monthKey(this.clock.now()).split('-').map(Number);
    const result: string[] = [];
    for (let i = MONTHS - 1; i >= 0; i--) {
      const idx = year * 12 + (month - 1) - i;
      const y = Math.floor(idx / 12);
      const m = (idx % 12) + 1;
      result.push(`${y}-${String(m).padStart(2, '0')}`);
    }
    return result;
  }
}
