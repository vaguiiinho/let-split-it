import { ValidationError } from '../../../../shared/domain/errors';

/** Senha em texto puro: só existe na entrada (criação), nunca é persistida nem devolvida. */
export class Password {
  static readonly MIN = 8;
  static readonly MAX = 128;
  private constructor(readonly value: string) {}

  static create(raw: unknown): Password {
    if (typeof raw !== 'string') throw new ValidationError('Senha é obrigatória');
    if (raw.length < Password.MIN || raw.length > Password.MAX) {
      throw new ValidationError(`Senha deve ter entre ${Password.MIN} e ${Password.MAX} caracteres`);
    }
    return new Password(raw);
  }
}
