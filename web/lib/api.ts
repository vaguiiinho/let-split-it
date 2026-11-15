import 'server-only';

import { redirect, unstable_rethrow } from 'next/navigation';
import { getSessionToken } from './session';
import type {
  AddMemberInput,
  ApiErrorBody,
  CreateExpenseInput,
  CreatePersonInput,
  CreateUserInput,
  Dashboard,
  GroupDetail,
  GroupSummary,
  Invite,
  LoginResponse,
  Me,
  Person,
  PersonDetail,
  PersonSummary,
  PurgeDemoResult,
  ReceivedInvite,
  RegisterPaymentInput,
  Settlement,
  UpdatePersonInput,
  User,
  UserSearchResult,
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

/**
 * Chamada à API. Com `auth` (padrão), envia `Authorization: Bearer <cookie session>`; um 401 nesse
 * caso redireciona para `/logout`, que apaga o cookie e manda para `/login?expired=1`. Componentes de
 * servidor não podem apagar cookie, e ir direto ao `/login` com cookie inválido entraria em loop com o proxy.
 */
async function request<T>(path: string, init: RequestInit = {}, { auth = true }: { auth?: boolean } = {}): Promise<T> {
  const token = auth ? await getSessionToken() : undefined;
  if (auth && !token) redirect('/logout');

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (err) {
    throw new ApiUnavailableError(err);
  }

  if (auth && res.status === 401) redirect('/logout');

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
  updateGroup: (id: string, name: string) =>
    request<GroupDetail>(`/groups/${enc(id)}`, { method: 'PATCH', body: json({ name }) }),
  deleteGroup: (id: string) => request<void>(`/groups/${enc(id)}`, { method: 'DELETE' }),
  addMember: (groupId: string, input: AddMemberInput) =>
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

  listPeople: () => request<PersonSummary[]>('/people'),
  getPerson: (id: string) => request<PersonDetail>(`/people/${enc(id)}`),
  createPerson: (input: CreatePersonInput) =>
    request<Person>('/people', { method: 'POST', body: json(input) }),
  updatePerson: (id: string, input: UpdatePersonInput) =>
    request<Person>(`/people/${enc(id)}`, { method: 'PATCH', body: json(input) }),
  deletePerson: (id: string) => request<void>(`/people/${enc(id)}`, { method: 'DELETE' }),

  getDashboard: () => request<Dashboard>('/dashboard'),

  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: json({ username, password }) }, { auth: false }),
  me: () => request<Me>('/auth/me'),

  listUsers: () => request<User[]>('/users'),
  createUser: (input: CreateUserInput) => request<User>('/users', { method: 'POST', body: json(input) }),
  searchUsers: (q: string) => request<UserSearchResult[]>(`/users/search?q=${enc(q)}`),
  purgeDemoData: () => request<PurgeDemoResult>('/admin/demo/purge', { method: 'POST' }),

  inviteUser: (groupId: string, input: { userId: string } | { username: string }) =>
    request<Invite>(`/groups/${enc(groupId)}/invites`, { method: 'POST', body: json(input) }),
  listGroupInvites: (groupId: string) => request<Invite[]>(`/groups/${enc(groupId)}/invites`),
  listMyInvites: () => request<ReceivedInvite[]>('/invites'),
  acceptInvite: (inviteId: string) =>
    request<{ groupId: string }>(`/invites/${enc(inviteId)}/accept`, { method: 'POST' }),
  declineInvite: (inviteId: string) => request<void>(`/invites/${enc(inviteId)}/decline`, { method: 'POST' }),
};

/**
 * Converte qualquer erro em mensagem amigável para exibir ao usuário. Erros internos do Next
 * (redirect/notFound) são relançados.
 */
export function toUserMessage(err: unknown): string {
  // redirect('/logout') (401) e notFound() do Next não podem virar mensagem: deixa subir.
  unstable_rethrow(err);
  if (err instanceof ApiError || err instanceof ApiUnavailableError) return err.message;
  return 'Algo deu errado por aqui. Tente de novo.';
}
