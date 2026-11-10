'use client';

import { FormError } from '@/features/ui/FormError';
import { useFormAction, type FormAction } from '@/features/ui/useFormAction';

export function CreateGroupForm({ action }: { action: FormAction }) {
  const { formRef, onSubmit, pending, error } = useFormAction(action);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <label htmlFor="group-name" className="field-label">
        Nome do rolê
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="group-name"
          name="name"
          required
          maxLength={60}
          autoComplete="off"
          placeholder="Ex.: Churras de domingo"
          className="input"
          aria-invalid={!!error}
          aria-describedby="group-name-error"
        />
        <button type="submit" className="btn btn-accent shrink-0" disabled={pending}>
          {pending ? 'Criando…' : 'Bora criar 🎉'}
        </button>
      </div>
      <FormError id="group-name-error" error={error} />
    </form>
  );
}
