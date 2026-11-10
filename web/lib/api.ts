import 'server-only';

import type {
  ApiErrorBody,
  CreateExpenseInput,
  GroupDetail,
  GroupSummary,
  RegisterPaymentInput,
  Settlement,
} from './types';

export type * from './types';

const API_URL = (process.env.API_URL ?? 'http://localhost:3333').replace(/\/+$/, '');

export const API_DOWN_MESSAGE =
  'Não consegui falar com a API do Racha Aí. Suba a API com npm run dev e tente de novo.';

/** Erro HTTP vindo da API (4xx/5xx), com a mensagem original propagada. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** A API não respondeu (fora do ar, porta errada, rede). */
export class ApiUnavailableError extends Error {
  constructor(cause?: unknown) {
    super(API_DOWN_MESSAGE, { cause });
    this.name = 'ApiUnavailableError';
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const msg = (body as ApiErrorBody).message;
    if (Array.isArray(msg) && msg.length > 0) return msg.join('; ');
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch (err) {
    throw new ApiUnavailableError(err);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(body, `Erro ${res.status} ao chamar a API.`));
  }
  return body as T;
}

const json = (data: unknown) => JSON.stringify(data);
const enc = encodeURIComponent;

export const api = {
  listGroups: () => request<GroupSummary[]>('/groups'),
  getGroup: (id: string) => request<GroupDetail>(`/groups/${enc(id)}`),
  createGroup: (name: string) =>
    request<GroupDetail>('/groups', { method: 'POST', body: json({ name }) }),
  deleteGroup: (id: string) => request<void>(`/groups/${enc(id)}`, { method: 'DELETE' }),
  addMember: (groupId: string, input: { name: string; pixKey?: string }) =>
    request<GroupDetail>(`/groups/${enc(groupId)}/members`, {
      method: 'POST',
      body: json(input),
    }),
  removeMember: (groupId: string, memberId: string) =>
    request<GroupDetail>(`/groups/${enc(groupId)}/members/${enc(memberId)}`, {
      method: 'DELETE',
    }),
  addExpense: (groupId: string, input: CreateExpenseInput) =>
    request<GroupDetail>(`/groups/${enc(groupId)}/expenses`, {
      method: 'POST',
      body: json(input),
    }),
  removeExpense: (groupId: string, expenseId: string) =>
    request<GroupDetail>(`/groups/${enc(groupId)}/expenses/${enc(expenseId)}`, {
      method: 'DELETE',
    }),
  registerPayment: (groupId: string, input: RegisterPaymentInput) =>
    request<GroupDetail>(`/groups/${enc(groupId)}/payments`, {
      method: 'POST',
      body: json(input),
    }),
  removePayment: (groupId: string, paymentId: string) =>
    request<GroupDetail>(`/groups/${enc(groupId)}/payments/${enc(paymentId)}`, {
      method: 'DELETE',
    }),
  getSettlement: (groupId: string) =>
    request<Settlement>(`/groups/${enc(groupId)}/settlement`),
};

/** Converte qualquer erro em mensagem amigável para exibir ao usuário. */
export function toUserMessage(err: unknown): string {
  if (err instanceof ApiError || err instanceof ApiUnavailableError) return err.message;
  return 'Algo deu errado por aqui. Tente de novo.';
}
