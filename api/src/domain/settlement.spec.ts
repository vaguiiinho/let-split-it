import { computeBalances, computeSettlement, computeTransfers, Balance } from './settlement';
import { Group } from './group';

const A = { id: 'a', name: 'A' };
const B = { id: 'b', name: 'B' };
const C = { id: 'c', name: 'C' };

describe('settlement', () => {
  it('cenário da spec: A pagou 90 e B pagou 30, entre A,B,C → C→A 4000, B→A 1000', () => {
    const g = Group.create('g', 'Churras', new Date());
    g.addMember('a', 'A');
    g.addMember('b', 'B');
    g.addMember('c', 'C');
    const all = [{ memberId: 'a' }, { memberId: 'b' }, { memberId: 'c' }];
    g.addExpense({ id: 'e1', description: 'Carne', amountCents: 9000, payerId: 'a', participants: all, createdAt: new Date() });
    g.addExpense({ id: 'e2', description: 'Cerveja', amountCents: 3000, payerId: 'b', participants: all, createdAt: new Date() });

    const s = g.settle();
    expect(s.totalCents).toBe(12000);
    expect(s.balances.map((b) => b.balanceCents)).toEqual([5000, -1000, -4000]);
    expect(s.transfers).toEqual([
      { fromId: 'c', fromName: 'C', toId: 'a', toName: 'A', amountCents: 4000 },
      { fromId: 'b', fromName: 'B', toId: 'a', toName: 'A', amountCents: 1000 },
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
        memberId: m.id, name: m.name, paidCents: 0, owedCents: 0, balanceCents: raw[i],
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
      { memberId: 'a', name: 'A', paidCents: 1001, owedCents: 501, balanceCents: 500 },
      { memberId: 'b', name: 'B', paidCents: 0, owedCents: 500, balanceCents: -500 },
    ]);
  });
});
