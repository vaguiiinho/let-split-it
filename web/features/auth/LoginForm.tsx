'use client';

import { FormError } from '@/features/ui/FormError';
import { useFormAction, type FormAction } from '@/features/ui/useFormAction';

/**
 * Login. Em erro (ex.: 401 "Usuário ou senha inválidos") a mensagem aparece e o que foi digitado
 * fica; no sucesso a action grava o cookie e redireciona para o `next`.
 */
export function LoginForm({ action, next }: { action: FormAction; next?: string }) {
  const { formRef, onSubmit, pending, error } = useFormAction(action);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4" aria-busy={pending}>
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="login-username" className="field-label">
          Usuário
        </label>
        <input
          id="login-username"
          name="username"
          required
          maxLength={30}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          placeholder="Ex.: huguinho"
          className="input"
          aria-invalid={!!error}
          aria-describedby="login-error"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="field-label">
          Senha
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          maxLength={128}
          autoComplete="current-password"
          className="input"
          aria-invalid={!!error}
          aria-describedby="login-error"
        />
      </div>
      <FormError id="login-error" error={error} />
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
