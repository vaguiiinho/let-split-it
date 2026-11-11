'use client';

import Link from 'next/link';
import { FormError } from '@/features/ui/FormError';
import { useFormAction, type FormAction } from '@/features/ui/useFormAction';

/**
 * Criar/editar pessoa. A action redireciona no sucesso; em erro (ex.: 409 nome duplicado)
 * a mensagem aparece e o que foi digitado continua no formulário.
 */
export function PersonForm({
  action,
  person,
  cancelHref,
}: {
  action: FormAction;
  person?: { id: string; name: string; pixKey: string | null };
  cancelHref: string;
}) {
  const { formRef, onSubmit, pending, error } = useFormAction(action);
  const editing = !!person;
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      {person && <input type="hidden" name="personId" value={person.id} />}
      <div>
        <label htmlFor="person-name" className="field-label">
          Nome
        </label>
        <input
          id="person-name"
          name="name"
          required
          maxLength={40}
          autoComplete="off"
          placeholder="Ex.: Ana"
          defaultValue={person?.name}
          className="input"
          aria-invalid={!!error}
          aria-describedby="person-name-hint person-error"
        />
        <p id="person-name-hint" className="hint">
          Precisa ser único: não dá pra ter duas “Ana” (maiúsculas não contam).
        </p>
      </div>
      <div>
        <label htmlFor="person-pix" className="field-label">
          Chave PIX <span className="font-normal text-muted">(opcional)</span>
        </label>
        <input
          id="person-pix"
          name="pixKey"
          maxLength={77}
          autoComplete="off"
          spellCheck={false}
          placeholder="CPF, e-mail, celular ou aleatória"
          defaultValue={person?.pixKey ?? ''}
          className="input"
          aria-describedby="person-pix-hint person-error"
        />
        <p id="person-pix-hint" className="hint">
          {editing
            ? 'Deixe vazio para remover a chave. A mudança vale em todos os rolês dela.'
            : 'Com chave PIX, o acerto já sai com copia e cola e QR Code.'}
        </p>
      </div>
      <FormError id="person-error" error={error} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Salvando…' : editing ? 'Salvar' : '+ Cadastrar pessoa'}
        </button>
        <Link href={cancelHref} className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
