import { computeBalances, computeSettlement, computeTransfers, Balance } from './settlement.service';
import { Group } from '../group.aggregate';
import { GroupName } from '../value-objects/group-name.vo';
import { makePerson } from '../../testing/fixtures';
import { AmountCents } from '../value-objects/amount-cents.vo';
import { ExpenseDescription } from '../value-objects/expense-description.vo';
import { Weight } from '../value-objects/weight.vo';

const A = { id: 'a', name: 'A' };
const B = { id: 'b', name: 'B' };
const C = { id: 'c', name: 'C' };

describe('settlement', () => {
  it('cenário da spec: A pagou 90 e B pagou 30, entre A,B,C → C→A 4000, B→A 1000', () => {
    const g = Group.create({ name: GroupName.create('Churras') }, new Date());
    const [a, b, c] = ['A', 'B', 'C'].map((n) => g.addMember(makePerson(n)));
    const all = [a, b, c].map((m) => ({ memberId: m.id, weight: Weight.create() }));
    const exp = (d: string, v: number, payer: typeof a) => ({
      description: ExpenseDescription.create(d),
      amount: AmountCents.create(v),
      payerId: payer.id,
      participants: all,
      createdAt: new Date(),
    });
    g.addExpense(exp('Carne', 9000, a));
    g.addExpense(exp('Cerveja', 3000, b));

    const s = g.settle();
    expect(s.totalCents).toBe(12000);
    expect(s.balances.map((b) => b.balanceCents)).toEqual([5000, -1000, -4000]);
    expect(s.transfers).toEqual([
      { fromId: c.id.value, fromName: 'C', toId: a.id.value, toName: 'A', amountCents: 4000 },
      { fromId: b.id.value, fromName: 'B', toId: a.id.value, toName: 'A', amountCents: 1000 },
    ]);
  });

  it('todos zerados → nenhuma transferência', () => {
    const s = computeSettlement([A, B], [
      { payerId: 'a', amountCents: 1000, shares: [{ memberId: 'a', shareCents: 1000 }] },
      { payerId: 'b', amountCents: 500, shares: [{ memberId: 'b', shareCents: 500 }] },
    ]);
    expect(s.balances.every((b) => b.balanceCents === 0)).toBe(true);
    expect(s.transfers).toEqual([]);
    expect(computeSettlement([A, B, C], []).transfers).toEqual([]);
  });

  it('Σ balances == 0 e saldos zeram após transferências; ≤ n−1 transferências', () => {
    let seed = 42;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    for (let round = 0; round < 200; round++) {
      const n = 2 + rand(8);
      const members = Array.from({ length: n }, (_, i) => ({ id: `m${i}`, name: `M${i}` }));
      const raw = members.map(() => rand(20000) - 10000);
      const sum = raw.reduce((a, b) => a + b, 0);
      raw[0] -= sum; // força Σ == 0
      const balances: Balance[] = members.map((m, i) => ({
        memberId: m.id, name: m.name, paidCents: 0, owedCents: 0, sentCents: 0, receivedCents: 0, balanceCents: raw[i],
      }));
      const transfers = computeTransfers(balances);
      expect(transfers.length).toBeLessThanOrEqual(n - 1);
      const rest = new Map(balances.map((b) => [b.memberId, b.balanceCents]));
      for (const t of transfers) {
        expect(t.amountCents).toBeGreaterThan(0);
        rest.set(t.fromId, rest.get(t.fromId)! + t.amountCents);
        rest.set(t.toId, rest.get(t.toId)! - t.amountCents);
      }
      expect([...rest.values()].every((v) => v === 0)).toBe(true);
    }
  });

  it('computeBalances: paid − owed', () => {
    const b = computeBalances([A, B], [
      { payerId: 'a', amountCents: 1001, shares: [{ memberId: 'a', shareCents: 501 }, { memberId: 'b', shareCents: 500 }] },
    ]);
    expect(b).toEqual([
      { memberId: 'a', name: 'A', paidCents: 1001, owedCents: 501, sentCents: 0, receivedCents: 0, balanceCents: 500 },
      { memberId: 'b', name: 'B', paidCents: 0, owedCents: 500, sentCents: 0, receivedCents: 0, balanceCents: -500 },
    ]);
  });

  it('pagamentos: balance = paid − owed + sent − received', () => {
    const expenses = [
      { payerId: 'a', amountCents: 1000, shares: [{ memberId: 'a', shareCents: 500 }, { memberId: 'b', shareCents: 500 }] },
    ];
    const s = computeSettlement([A, B], expenses, [{ fromId: 'b', toId: 'a', amountCents: 200 }]);
    expect(s.balances.map((x) => x.balanceCents)).toEqual([300, -300]);
    expect(s.balances[1].sentCents).toBe(200);
    expect(s.balances[0].receivedCents).toBe(200);
    expect(s.transfers).toEqual([{ fromId: 'b', fromName: 'B', toId: 'a', toName: 'A', amountCents: 300 }]);
    expect(s.totalCents).toBe(1000);
  });
});
