import { ValidationError } from '../../../../shared/domain/errors';

/** Valor em centavos de despesa ou pagamento: inteiro 1..100_000_000. */
export class AmountCents {
  static readonly MAX = 100_000_000;
  private constructor(readonly value: number) {}

  static create(raw: unknown): AmountCents {
    if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 1 || raw > AmountCents.MAX) {
      throw new ValidationError(
        `Valor deve ser um inteiro de centavos entre 1 e ${AmountCents.MAX}`,
      );
    }
    return new AmountCents(raw);
  }
}
