import { ValidationError } from '../../../../shared/domain/errors';

export class PixKey {
  static readonly MAX = 77;
  private constructor(readonly value: string) {}

  /** `undefined`/`null`/vazio → null. */
  static createOptional(raw: unknown): PixKey | null {
    if (raw === undefined || raw === null) return null;
    if (typeof raw !== 'string') throw new ValidationError('Chave PIX inválida');
    const key = raw.trim();
    if (!key) return null;
    if (key.length > PixKey.MAX) {
      throw new ValidationError(`Chave PIX deve ter no máximo ${PixKey.MAX} caracteres`);
    }
    // Chaves PIX são sempre ASCII imprimível; garante também que o TLV caiba no BR Code.
    if (!/^[\x21-\x7E]+$/.test(key)) {
      throw new ValidationError(
        'Chave PIX deve conter apenas letras sem acento, números e símbolos (sem espaços)',
      );
    }
    return new PixKey(key);
  }
}
