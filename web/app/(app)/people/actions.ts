'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, toUserMessage } from '@/lib/api';
import type { ActionResult } from '@/lib/types';
import { firstIssue, idSchema, personSchema, str } from '@/lib/validation';

type Prev = ActionResult | null;

const readPerson = (fd: FormData) => personSchema.safeParse({ name: str(fd, 'name'), pixKey: str(fd, 'pixKey') });

export async function createPersonAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const parsed = readPerson(fd);
  if (!parsed.success) return firstIssue(parsed.error);
  const { name, pixKey } = parsed.data;
  let id: string;
  try {
    id = (await api.createPerson(pixKey ? { name, pixKey } : { name })).id;
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
  revalidatePath('/', 'layout');
  redirect(`/people/${id}`);
}

export async function updatePersonAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(str(fd, 'personId'));
  if (!id.success) return firstIssue(id.error);
  const parsed = readPerson(fd);
  if (!parsed.success) return firstIssue(parsed.error);
  try {
    // pixKey null limpa a chave (campo deixado vazio).
    await api.updatePerson(id.data, parsed.data);
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
  revalidatePath('/', 'layout');
  redirect(`/people/${id.data}`);
}

export async function deletePersonAction(_prev: Prev, fd: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(str(fd, 'personId'));
  if (!id.success) return firstIssue(id.error);
  try {
    await api.deletePerson(id.data);
  } catch (err) {
    // 409: a pessoa participa de algum rolê — a mensagem da API aparece ao lado do botão.
    return { ok: false, error: toUserMessage(err) };
  }
  revalidatePath('/', 'layout');
  redirect('/people');
}
