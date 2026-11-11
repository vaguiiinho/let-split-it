import { Group } from '../../domain/group.aggregate';
import { AmountCents } from '../../domain/value-objects/amount-cents.vo';
import { ExpenseDescription } from '../../domain/value-objects/expense-description.vo';
import { GroupName } from '../../domain/value-objects/group-name.vo';
import { Weight } from '../../domain/value-objects/weight.vo';
import { makePeopleRepo, makePerson, makeRepo } from '../../testing/fixtures';
import { GetDashboardUseCase } from './get-dashboard.use-case';

const clock = { now: () => new Date('2026-11-10T12:00:00-03:00') };

async function build() {
  const repo = makeRepo();
  const people = makePeopleRepo();
  const uc = new GetDashboardUseCase(repo, people, clock);
  const persons = [makePerson('Ana'), makePerson('Bia'), makePerson('Cadu')];
  for (const p of persons) await people.save(p);
  const newGroup = (name: string) => {
    const g = Group.create({ name: GroupName.create(name) }, new Date('2026-01-01'));
    const [ana, bia, cadu] = persons.map((p) => g.addMember(p));
    const all = [ana, bia, cadu].map((m) => ({ memberId: m.id, weight: Weight.create() }));
    const add = (v: number, payer: typeof ana, at: string) =>
      g.addExpense({
        description: ExpenseDescription.create('Gasto'),
        amount: AmountCents.create(v),
        payerId: payer.id,
        participants: all,
        createdAt: new Date(at),
      });
    return { g, ana, bia, cadu, add };
  };
  return { repo, people, uc, newGroup };
}

describe('GetDashboardUseCase', () => {
  it('banco vazio: zeros, listas vazias e 6 meses', async () => {
    const { uc } = await build();
    const out = await uc.execute({});
    expect(out.totals).toMatchObject({ spentCents: 0, settledCents: 0, pendingCents: 0, groupCount: 0, expenseCount: 0 });
    expect(out.totals.peopleCount).toBe(3);
    expect(out.groupsByStatus).toEqual({ settled: 0, pending: 0, empty: 0 });
    expect(out.byGroup).toEqual([]);
    expect(out.topPayers).toEqual([]);
    expect(out.byMonth.map((m) => m.month)).toEqual([
      '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11',
    ]);
    expect(out.byMonth.every((m) => m.totalCents === 0)).toBe(true);
  });

  it('cenário Ana/Bia/Cadu com pagamento Cadu→Ana 1500', async () => {
    const { repo, uc, newGroup } = await build();
    const { g, ana, bia, cadu, add } = newGroup('Churras');
    add(9000, ana, '2026-06-30T23:30:00-03:00');
    add(3000, bia, '2026-11-01T10:00:00-03:00');
    g.registerPayment(cadu.id, ana.id, AmountCents.create(1500), new Date());
    await repo.save(g);
    await repo.save(newGroup('Vazio').g);

    const out = await uc.execute({});
    expect(out.totals).toMatchObject({
      spentCents: 12000,
      settledCents: 1500,
      pendingCents: 3500,
      groupCount: 2,
      expenseCount: 2,
    });
    expect(out.groupsByStatus).toEqual({ settled: 0, pending: 1, empty: 1 });
    expect(out.topPayers[0]).toMatchObject({ name: 'Ana', paidCents: 9000 });
    expect(out.topPayers).toHaveLength(2);
    expect(out.byGroup).toEqual([expect.objectContaining({ name: 'Churras', totalCents: 12000 })]);
    expect(out.byMonth.find((m) => m.month === '2026-06')?.totalCents).toBe(9000);
    expect(out.byMonth.find((m) => m.month === '2026-11')?.totalCents).toBe(3000);
  });

  it('despesa de 01/07 02:00 UTC (30/06 BRT) cai em junho; byGroup limitado a 8', async () => {
    const { repo, uc, newGroup } = await build();
    const { g, ana, add } = newGroup('Quitado');
    add(300, ana, '2026-07-01T02:00:00Z');
    await repo.save(g);
    expect((await uc.execute({})).byMonth[0]).toEqual({ month: '2026-06', totalCents: 300 });

    for (let i = 0; i < 9; i++) {
      const x = newGroup(`G${i}`);
      x.add(1000 + i, x.ana, '2026-11-02T10:00:00-03:00');
      await repo.save(x.g);
    }
    const out = await uc.execute({});
    expect(out.byGroup).toHaveLength(8);
    expect(out.byGroup[0].totalCents).toBe(1008);
    expect(out.byGroup.every((b) => b.totalCents > 0)).toBe(true);
    expect(out.topPayers).toHaveLength(1);
  });

  it('rolê com despesas e sem transferências conta como settled', async () => {
    const { repo, uc, newGroup } = await build();
    const { g, ana, add } = newGroup('Solo');
    g.addExpense({
      description: ExpenseDescription.create('Sozinha'),
      amount: AmountCents.create(500),
      payerId: ana.id,
      participants: [{ memberId: ana.id, weight: Weight.create() }],
      createdAt: new Date('2026-11-02T10:00:00-03:00'),
    });
    void add;
    await repo.save(g);
    expect((await uc.execute({})).groupsByStatus).toEqual({ settled: 1, pending: 0, empty: 0 });
  });
});
