'use client';

import { useEffect, useRef } from 'react';
import { FormError } from '@/features/ui/FormError';
import { useFormAction, type FormAction } from '@/features/ui/useFormAction';

/**
 * Cria um usuário. No erro (ex.: 409 username duplicado) a mensagem aparece e os campos ficam,
 * menos a senha, que é limpa. No sucesso o formulário zera e a tabela é revalidada.
 */
export function CreateUserForm({ action }: { action: FormAction }) {
  const { formRef, onSubmit, pending, error, state } = useFormAction(action);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state && !state.ok && passwordRef.current) passwordRef.current.value = '';
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4" aria-busy={pending}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-user-username" className="field-label">
            Usuário
          </label>
          <input
            id="new-user-username"
            name="username"
            required
            minLength={3}
            maxLength={30}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Ex.: ana.souza"
            className="input"
            aria-invalid={!!error}
            aria-describedby="new-user-username-hint new-user-error"
          />
          <p id="new-user-username-hint" className="hint">
            3 a 30 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.
          </p>
        </div>
        <div>
          <label htmlFor="new-user-password" className="field-label">
            Senha
          </label>
          <input
            ref={passwordRef}
            id="new-user-password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className="input"
            aria-invalid={!!error}
            aria-describedby="new-user-password-hint new-user-error"
          />
          <p id="new-user-password-hint" className="hint">
            De 8 a 128 caracteres.
          </p>
        </div>
        <div>
          <label htmlFor="new-user-name" className="field-label">
            Nome <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="new-user-name"
            name="name"
            maxLength={40}
            autoComplete="off"
            placeholder="Ex.: Ana"
            className="input"
            aria-describedby="new-user-name-hint new-user-error"
          />
          <p id="new-user-name-hint" className="hint">
            Vazio usa o usuário. Se já existir uma pessoa com esse nome, ela será vinculada (e a conta passa a ver os rolês
            dela).
          </p>
        </div>
        <div>
          <label htmlFor="new-user-role" className="field-label">
            Papel
          </label>
          <select id="new-user-role" name="role" defaultValue="USER" className="input" aria-describedby="new-user-error">
            <option value="USER">Usuário</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
      </div>
      <FormError id="new-user-error" error={error} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Criando…' : '+ Criar usuário'}
      </button>
    </form>
  );
}
