// Tipos do contrato HTTP da API (specs 001–003). Valores monetários sempre em centavos.

/** Participante do rolê. Desde a spec 003, `id` é o id da pessoa (`personId`). */
export interface Member {
  id: string;
  name: string;
  pixKey: string | null;
}

export interface ExpenseParticipant {
  memberId: string;
  weight: number;
  shareCents: number;
}

export interface Expense {
  id: string;
  description: string;
  amountCents: number;
  payerId: string;
  createdAt: string;
  participants: ExpenseParticipant[];
}

export interface Payment {
  id: string;
  fromId: string;
  toId: string;
  amountCents: number;
  createdAt: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  createdAt: string;
  totalCents: number;
  members: Member[];
  expenses: Expense[];
  /** Pagamentos registrados (mais recente primeiro). */
  payments: Payment[];
}

export interface GroupSummary {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  expenseCount: number;
  totalCents: number;
}

export interface Balance {
  memberId: string;
  name: string;
  paidCents: number;
  owedCents: number;
  /** Total já pago a outras pessoas via pagamentos registrados. */
  sentCents: number;
  /** Total já recebido de outras pessoas via pagamentos registrados. */
  receivedCents: number;
  balanceCents: number;
}

export interface Transfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
  pixPayload: string | null;
}

export interface Settlement {
  totalCents: number;
  balances: Balance[];
  transfers: Transfer[];
}

export interface CreateExpenseInput {
  description: string;
  amountCents: number;
  payerId: string;
  participants: { memberId: string; weight?: number }[];
}

export interface RegisterPaymentInput {
  fromId: string;
  toId: string;
  amountCents: number;
}

export interface Person {
  id: string;
  name: string;
  pixKey: string | null;
  createdAt: string;
}

export interface PersonSummary extends Person {
  groupCount: number;
}

export interface PersonGroup {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  totalCents: number;
}

export interface PersonDetail extends Person {
  /** Rolês de que a pessoa participa (mais recente primeiro). */
  groups: PersonGroup[];
}

export interface CreatePersonInput {
  name: string;
  pixKey?: string | null;
}

/** `pixKey: null` (ou '') limpa a chave. Ao menos um campo é obrigatório. */
export interface UpdatePersonInput {
  name?: string;
  pixKey?: string | null;
}

export type AddMemberInput = { personId: string } | { name: string; pixKey?: string };

export interface Dashboard {
  totals: {
    spentCents: number;
    settledCents: number;
    pendingCents: number;
    groupCount: number;
    peopleCount: number;
    expenseCount: number;
  };
  groupsByStatus: { settled: number; pending: number; empty: number };
  /** Até 8 rolês com maior total (> 0), em ordem decrescente. */
  byGroup: { groupId: string; name: string; totalCents: number }[];
  /** Até 5 pessoas que mais pagaram despesas, em ordem decrescente. */
  topPayers: { personId: string; name: string; paidCents: number }[];
  /** 6 meses (YYYY-MM), do mais antigo ao mais recente. */
  byMonth: { month: string; totalCents: number }[];
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string };
