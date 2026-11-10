'use client';

import { FormError } from '@/features/ui/FormError';
import { useFormAction, type FormAction } from '@/features/ui/useFormAction';
import type { Transfer } from '@/lib/types';

/** "80,00" a partir de 8000 centavos — formato aceito por parseMoneyToCents. */
function toInputValue(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/** Registra um pagamento (total ou parcial) da transferência sugerida. */
export function RegisterPaymentForm({
  action,
  groupId,
  transfer,
}: {
  action: FormAction;
  groupId: string;
  transfer: Transfer;
}) {
  const { formRef, onSubmit, pending, error } = useFormAction(action);
  const base = `pay-${transfer.fromId}-${transfer.toId}`;
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-3 border-t-2 border-line/15 pt-3">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="fromId" value={transfer.fromId} />
      <input type="hidden" name="toId" value={transfer.toId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${base}-amount`} className="field-label">
            Já pagou? Registre o valor <span className="font-normal text-muted">(total ou parte)</span>
          </label>
          <input
            id={`${base}-amount`}
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            required
            defaultValue={toInputValue(transfer.amountCents)}
            aria-describedby={`${base}-error`}
            className="input tabular-nums"
          />
        </div>
        <button type="submit" className="btn btn-primary text-sm" disabled={pending}>
          {pending ? 'Registrando…' : '✓ Registrar pagamento'}
        </button>
      </div>
      <FormError id={`${base}-error`} error={error} />
    </form>
  );
}
