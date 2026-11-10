import { Group } from '../../domain/group.aggregate';
import { buildPixPayload } from '../../domain/services/pix.service';

export type SettlementOutput = {
  totalCents: number;
  balances: {
    memberId: string;
    name: string;
    paidCents: number;
    owedCents: number;
    sentCents: number;
    receivedCents: number;
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
};

export function toSettlementOutput(group: Group): SettlementOutput {
  const result = group.settle();
  const pixKeys = new Map(group.members.map((m) => [m.id.value, m.pixKey?.value ?? null]));
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
