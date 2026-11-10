'use client';

import { useId, useState } from 'react';
import { FormError } from '@/features/ui/FormError';
import { useFormAction, type FormAction } from '@/features/ui/useFormAction';
import type { Member } from '@/lib/types';

type Props = { action: FormAction; groupId: string; members: Member[] };

/** Remonta o formulário após sucesso para voltar tudo ao estado inicial (inclusive checkboxes). */
export function ExpenseForm(props: Props) {
  const [round, setRound] = useState(0);
  return <ExpenseFormInner key={round} {...props} onDone={() => setRound((r) => r + 1)} />;
}

function ExpenseFormInner({ action, groupId, members, onDone }: Props & { onDone: () => void }) {
  const uid = useId();
  const allIds = members.map((m) => m.id);
  const [selected, setSelected] = useState<string[]>(allIds);
  const [useWeights, setUseWeights] = useState(false);
  const { formRef, onSubmit, pending, error } = useFormAction(action, onDone);

  // Ignora ids de pessoas que já saíram do rolê.
  const checked = selected.filter((id) => allIds.includes(id));
  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-labelledby={`${uid}-title`} className="space-y-4">
      <h3 id={`${uid}-title`} className="font-extrabold">
        Lançar despesa
      </h3>
      <input type="hidden" name="groupId" value={groupId} />
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor={`${uid}-desc`} className="field-label">
            Descrição
          </label>
          <input
            id={`${uid}-desc`}
            name="description"
            required
            maxLength={80}
            autoComplete="off"
            placeholder="Ex.: Carne e carvão"
            className="input"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-amount`} className="field-label">
            Valor (R$)
          </label>
          <input
            id={`${uid}-amount`}
            name="amount"
            required
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            className="input tabular-nums"
            aria-describedby={`${uid}-amount-hint`}
          />
          <p id={`${uid}-amount-hint`} className="hint">
            Aceita 12,34 ou 1.234,56
          </p>
        </div>
      </div>

      <div>
        <label htmlFor={`${uid}-payer`} className="field-label">
          Quem pagou?
        </label>
        <select id={`${uid}-payer`} name="payerId" required defaultValue="" className="input">
          <option value="" disabled>
            Escolha…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="field-label">Dividir entre</legend>
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <button
            type="button"
            className="rounded font-bold text-brand underline underline-offset-2"
            onClick={() => setSelected(checked.length === allIds.length ? [] : allIds)}
          >
            {checked.length === allIds.length ? 'Desmarcar todos' : 'Marcar todos'}
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={useWeights}
              onChange={(e) => setUseWeights(e.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            Usar pesos (ex.: quem comeu em dobro = 2)
          </label>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {members.map((m) => {
            const isOn = checked.includes(m.id);
            return (
              <li
                key={m.id}
                className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 ${isOn ? 'border-line bg-surface-2' : 'border-line/25'}`}
              >
                <label className="flex min-h-7 flex-1 cursor-pointer items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    name="participant"
                    value={m.id}
                    checked={isOn}
                    onChange={() => toggle(m.id)}
                    className="size-5 accent-[var(--brand)]"
                  />
                  <span className="break-words">{m.name}</span>
                </label>
                {useWeights && isOn && (
                  <label className="flex items-center gap-1 text-sm">
                    <span>peso</span>
                    <input
                      type="number"
                      name={`weight-${m.id}`}
                      min={1}
                      max={100}
                      step={1}
                      defaultValue={1}
                      aria-label={`Peso de ${m.name}`}
                      className="input min-h-9 w-16 px-2 py-1 text-center"
                    />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
        {pending ? 'Lançando…' : '💸 Lançar despesa'}
      </button>
      <FormError id={`${uid}-error`} error={error} />
    </form>
  );
}
