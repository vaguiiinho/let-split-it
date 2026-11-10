'use client';

import { FormError } from '@/features/ui/FormError';
import { useFormAction, type FormAction } from '@/features/ui/useFormAction';

export function AddMemberForm({ action, groupId }: { action: FormAction; groupId: string }) {
  const { formRef, onSubmit, pending, error } = useFormAction(action);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-labelledby="add-member-title">
      <h3 id="add-member-title" className="mb-2 font-extrabold">
        Adicionar pessoa
      </h3>
      <input type="hidden" name="groupId" value={groupId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="member-name" className="field-label">
            Nome
          </label>
          <input id="member-name" name="name" required maxLength={40} autoComplete="off" placeholder="Ex.: Ana" className="input" />
        </div>
        <div>
          <label htmlFor="member-pix" className="field-label">
            Chave PIX <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="member-pix"
            name="pixKey"
            maxLength={77}
            autoComplete="off"
            spellCheck={false}
            placeholder="CPF, e-mail, celular ou aleatória"
            className="input"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Adicionando…' : '+ Adicionar'}
        </button>
      </div>
      <FormError id="add-member-error" error={error} />
    </form>
  );
}
