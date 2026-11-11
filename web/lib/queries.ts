import 'server-only';

import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ApiError, api } from './api';

/**
 * Leituras deduplicadas por requisição (React.cache): o layout do rolê, a página e o
 * generateMetadata compartilham o mesmo GET.
 */
export const getGroup = cache((id: string) => api.getGroup(id));
export const getSettlement = cache((id: string) => api.getSettlement(id));
export const getPerson = cache((id: string) => api.getPerson(id));
export const listPeople = cache(() => api.listPeople());

/** 400 (id inválido) e 404 viram a página not-found; o resto sobe para o error boundary. */
async function or404<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 400 || err.status === 404)) notFound();
    throw err;
  }
}

export const loadGroupOr404 = (id: string) => or404(getGroup(id));
export const loadSettlementOr404 = (id: string) => or404(getSettlement(id));
export const loadPersonOr404 = (id: string) => or404(getPerson(id));

/** Título da aba do navegador para as páginas do rolê: "Churras — Despesas". */
export async function groupTitle(id: string, section?: string): Promise<{ title: string }> {
  try {
    const { name } = await getGroup(id);
    return { title: section ? `${name} — ${section}` : name };
  } catch {
    return { title: section ?? 'Rolê' };
  }
}
