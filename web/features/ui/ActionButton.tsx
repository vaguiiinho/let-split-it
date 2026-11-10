'use client';

import { useFormAction, type FormAction } from './useFormAction';

/** Botão que dispara uma Server Action com campos ocultos e mostra o erro (ex.: 409). */
export function ActionButton({
  action,
  fields,
  label,
  pendingLabel,
  className = 'btn-icon',
  confirmMessage,
  children,
}: {
  action: FormAction;
  fields: Record<string, string>;
  label: string;
  pendingLabel?: string;
  className?: string;
  confirmMessage?: string;
  children: React.ReactNode;
}) {
  const { onSubmit, pending, error } = useFormAction(action);
  return (
    <form
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      className="contents"
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={className} aria-label={pending ? (pendingLabel ?? label) : label} disabled={pending} title={label}>
        {children}
      </button>
      {error && (
        <span role="alert" className="basis-full text-sm font-semibold text-neg">
          {error}
        </span>
      )}
    </form>
  );
}
