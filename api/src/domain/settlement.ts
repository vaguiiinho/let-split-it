export interface SettlementMemberInput {
  id: string;
  name: string;
}

export interface SettlementExpenseInput {
  payerId: string;
  amountCents: number;
  shares: { memberId: string; shareCents: number }[];
}

export interface Balance {
  memberId: string;
  name: string;
  paidCents: number;
  owedCents: number;
  balanceCents: number;
}

export interface Transfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
}

export interface SettlementResult {
  totalCents: number;
  balances: Balance[];
  transfers: Transfer[];
}

/** balance = paid − owed, na ordem dos membros. Σ balances == 0. */
export function computeBalances(
  members: readonly SettlementMemberInput[],
  expenses: readonly SettlementExpenseInput[],
): Balance[] {
  const map = new Map<string, Balance>();
  for (const m of members) {
    map.set(m.id, { memberId: m.id, name: m.name, paidCents: 0, owedCents: 0, balanceCents: 0 });
  }
  for (const e of expenses) {
    const payer = map.get(e.payerId);
    if (payer) payer.paidCents += e.amountCents;
    for (const s of e.shares) {
      const b = map.get(s.memberId);
      if (b) b.owedCents += s.shareCents;
    }
  }
  const balances = [...map.values()];
  for (const b of balances) b.balanceCents = b.paidCents - b.owedCents;
  return balances;
}

/**
 * Heurística gulosa: casa repetidamente o maior devedor com o maior credor,
 * transferindo min(|devedor|, credor). Cada passo zera ao menos um → ≤ n−1 transferências.
 * Empates resolvidos pela ordem dos membros (determinístico).
 */
export function computeTransfers(balances: readonly Balance[]): Transfer[] {
  const people = balances.map((b, order) => ({ ...b, order, rest: b.balanceCents }));
  const pick = (sign: 1 | -1) =>
    people
      .filter((p) => p.rest * sign > 0)
      .sort((a, b) => Math.abs(b.rest) - Math.abs(a.rest) || a.order - b.order)[0];

  const transfers: Transfer[] = [];
  for (;;) {
    const debtor = pick(-1);
    const creditor = pick(1);
    if (!debtor || !creditor) break;
    const amount = Math.min(-debtor.rest, creditor.rest);
    transfers.push({
      fromId: debtor.memberId,
      fromName: debtor.name,
      toId: creditor.memberId,
      toName: creditor.name,
      amountCents: amount,
    });
    debtor.rest += amount;
    creditor.rest -= amount;
  }
  return transfers;
}

export function computeSettlement(
  members: readonly SettlementMemberInput[],
  expenses: readonly SettlementExpenseInput[],
): SettlementResult {
  const balances = computeBalances(members, expenses);
  return {
    totalCents: expenses.reduce((acc, e) => acc + e.amountCents, 0),
    balances,
    transfers: computeTransfers(balances),
  };
}
