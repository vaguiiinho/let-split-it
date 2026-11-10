import { Group } from '../../domain/group.aggregate';

export type GroupDetailOutput = {
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
  payments: {
    id: string;
    fromId: string;
    toId: string;
    amountCents: number;
    createdAt: string;
  }[];
};

export function toGroupDetailOutput(group: Group): GroupDetailOutput {
  return {
    id: group.id.value,
    name: group.name.value,
    createdAt: group.createdAt.toISOString(),
    totalCents: group.totalCents,
    members: group.members.map((m) => ({
      id: m.id.value,
      name: m.name.value,
      pixKey: m.pixKey?.value ?? null,
    })),
    expenses: [...group.expenses].reverse().map((e) => ({
      id: e.id.value,
      description: e.description.value,
      amountCents: e.amount.value,
      payerId: e.payerId.value,
      createdAt: e.createdAt.toISOString(),
      participants: e.shares().map((s) => ({
        memberId: s.memberId.value,
        weight: s.weight,
        shareCents: s.shareCents,
      })),
    })),
    payments: [...group.payments].reverse().map((p) => ({
      id: p.id.value,
      fromId: p.fromId.value,
      toId: p.toId.value,
      amountCents: p.amount.value,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}
