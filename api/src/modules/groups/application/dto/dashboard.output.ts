export type DashboardOutput = {
  totals: {
    spentCents: number;
    settledCents: number;
    pendingCents: number;
    groupCount: number;
    peopleCount: number;
    expenseCount: number;
  };
  groupsByStatus: { settled: number; pending: number; empty: number };
  byGroup: { groupId: string; name: string; totalCents: number }[];
  topPayers: { personId: string; name: string; paidCents: number }[];
  byMonth: { month: string; totalCents: number }[];
};
