import { ValidationError } from '../../../../shared/domain/errors';

/**
 * Divide `amountCents` proporcionalmente a `weights` pelo método do maior resto.
 * share_i = floor(amount * w_i / Σw); os centavos restantes vão, um a um, aos de maior
 * resto (desempate pela ordem). Garante Σ shares == amount.
 */
export function splitByWeights(amountCents: number, weights: readonly number[]): number[] {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new ValidationError('Valor a dividir deve ser um inteiro >= 0');
  }
  if (weights.length === 0) {
    throw new ValidationError('É preciso ao menos um participante');
  }
  if (weights.some((w) => !Number.isSafeInteger(w) || w <= 0)) {
    throw new ValidationError('Pesos devem ser inteiros positivos');
  }
  const total = weights.reduce((a, b) => a + b, 0);
  // amount ≤ 1e8 e Σw ≤ 1e2 * n → produtos cabem com folga em inteiros seguros.
  const shares = weights.map((w) => Math.floor((amountCents * w) / total));
  const remainders = weights.map((w, i) => ({ i, r: (amountCents * w) % total }));
  let left = amountCents - shares.reduce((a, b) => a + b, 0);
  remainders.sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0; k++, left--) {
    shares[remainders[k % remainders.length].i] += 1;
  }
  return shares;
}
