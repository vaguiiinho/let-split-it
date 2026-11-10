import { ValidationError } from '../../../../shared/domain/errors';

export class Weight {
  static readonly MIN = 1;
  static readonly MAX = 100;
  private constructor(readonly value: number) {}

  /** `undefined` → 1. */
  static create(raw?: unknown): Weight {
    const v = raw === undefined ? 1 : raw;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < Weight.MIN || v > Weight.MAX) {
      throw new ValidationError(`Peso deve ser inteiro entre ${Weight.MIN} e ${Weight.MAX}`);
    }
    return new Weight(v);
  }
}
