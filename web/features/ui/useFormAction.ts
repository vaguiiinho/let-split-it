'use client';

import { startTransition, useActionState, useRef, type FormEvent } from 'react';
import type { ActionResult } from '@/lib/types';

export type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * Envolve uma Server Action para useActionState sem o reset automático do React 19
 * (que apagaria o que a pessoa digitou quando a API devolve erro). Só limpa no sucesso.
 */
export function useFormAction(action: FormAction, onSuccess?: () => void) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState<ActionResult | null, FormData>(async (prev, fd) => {
    const result = await action(prev, fd);
    if (result.ok) {
      formRef.current?.reset();
      onSuccess?.();
    }
    return result;
  }, null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  }

  return { formRef, state, pending, onSubmit, error: state && !state.ok ? state.error : null };
}
