// Tipos do contrato HTTP da API (spec 001). Valores monetários sempre em centavos.

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

export interface GroupDetail {
  id: string;
  name: string;
  createdAt: string;
  totalCents: number;
  members: Member[];
  expenses: Expense[];
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

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string };
