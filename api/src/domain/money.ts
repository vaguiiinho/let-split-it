import { ValidationError } from './errors';

/** Valor monetário em centavos (inteiro, >= 0). */
export class Money {
  private constructor(readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new ValidationError('Valor deve ser um inteiro de centavos >= 0');
    }
    return new Money(cents);
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  /** Formato decimal com ponto e 2 casas, ex.: 1234 → "12.34". */
  toDecimalString(): string {
    const reais = Math.floor(this.cents / 100);
    const cents = this.cents % 100;
    return `${reais}.${cents.toString().padStart(2, '0')}`;
  }
}
