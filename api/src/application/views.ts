import { Group } from '../domain/group';
import { buildPixPayload } from '../domain/pix';

export interface GroupDetailView {
  id: string;
  name: string;
  createdAt: string;
  totalCents: number;
  members: { id: string; name: string; pixKey: string | null }[];
  expenses: {
    id: string;
    description: string;
    amountCents: number;
    payerId: string;
    createdAt: string;
    participants: { memberId: string; weight: number; shareCents: number }[];
  }[];
}

export interface SettlementView {
  totalCents: number;
  balances: {
    memberId: string;
    name: string;
    paidCents: number;
    owedCents: number;
    balanceCents: number;
  }[];
  transfers: {
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    amountCents: number;
    pixPayload: string | null;
  }[];
}

export function toGroupDetail(group: Group): GroupDetailView {
  return {
    id: group.id,
    name: group.name,
    createdAt: group.createdAt.toISOString(),
    totalCents: group.totalCents,
    members: group.members.map((m) => ({ id: m.id, name: m.name, pixKey: m.pixKey })),
    expenses: [...group.expenses].reverse().map((e) => ({
      id: e.id,
      description: e.description,
      amountCents: e.amountCents,
      payerId: e.payerId,
      createdAt: e.createdAt.toISOString(),
      participants: Group.sharesOf(e).map((s) => ({
        memberId: s.memberId,
        weight: s.weight,
        shareCents: s.shareCents,
      })),
    })),
  };
}

export function toSettlement(group: Group): SettlementView {
  const result = group.settle();
  const pixKeys = new Map(group.members.map((m) => [m.id, m.pixKey]));
  return {
    totalCents: result.totalCents,
    balances: result.balances.map((b) => ({ ...b })),
    transfers: result.transfers.map((t) => {
      const key = pixKeys.get(t.toId);
      return {
        ...t,
        pixPayload: key
          ? buildPixPayload({ key, merchantName: t.toName, amountCents: t.amountCents })
          : null,
      };
    }),
  };
}
