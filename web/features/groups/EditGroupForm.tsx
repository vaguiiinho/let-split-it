'use client';

import Link from 'next/link';
import { FormError } from '@/features/ui/FormError';
import { useFormAction, type FormAction } from '@/features/ui/useFormAction';

/** Renomeia o rolê. No sucesso a action redireciona; no erro, o digitado fica. */
export function EditGroupForm({ action, groupId, name }: { action: FormAction; groupId: string; name: string }) {
  const { formRef, onSubmit, pending, error } = useFormAction(action);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <input type="hidden" name="groupId" value={groupId} />
      <label htmlFor="edit-group-name" className="field-label">
        Nome do rolê
      </label>
      <input
        id="edit-group-name"
        name="name"
        required
        maxLength={60}
        autoComplete="off"
        defaultValue={name}
        className="input"
        aria-invalid={!!error}
        aria-describedby="edit-group-error"
      />
      <FormError id="edit-group-error" error={error} />
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href={`/groups/${groupId}`} className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
