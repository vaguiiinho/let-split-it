'use client';

import { FormError } from '@/features/ui/FormError';
import { useFormAction, type FormAction } from '@/features/ui/useFormAction';

/** Adiciona ao rolê uma pessoa já cadastrada. `people` já vem sem quem está no rolê. */
export function AddExistingMemberForm({
  action,
  groupId,
  people,
}: {
  action: FormAction;
  groupId: string;
  people: { id: string; name: string; pixKey: string | null }[];
}) {
  const { formRef, onSubmit, pending, error } = useFormAction(action);

  if (people.length === 0) {
    return (
      <div>
        <h3 className="mb-1 font-extrabold">Adicionar pessoa cadastrada</h3>
        <p className="rounded-xl bg-surface-2 p-3 text-sm">
          Todo mundo que está em Pessoas já está neste rolê.{' '}
          <a href="#nova-pessoa" className="font-bold text-link underline underline-offset-2">
            Crie uma pessoa nova
          </a>{' '}
          logo abaixo. 👇
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-labelledby="add-existing-title">
      <h3 id="add-existing-title" className="mb-3 font-extrabold">
        Adicionar pessoa cadastrada
      </h3>
      <input type="hidden" name="groupId" value={groupId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor="existing-person" className="field-label">
            Pessoa
          </label>
          <select
            id="existing-person"
            name="personId"
            required
            defaultValue=""
            className="input"
            aria-invalid={!!error}
            aria-describedby="add-existing-error"
          >
            <option value="" disabled>
              Escolha…
            </option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.pixKey ? ' · com PIX' : ''}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Adicionando…' : '+ Adicionar'}
        </button>
      </div>
      <FormError id="add-existing-error" error={error} />
    </form>
  );
}
