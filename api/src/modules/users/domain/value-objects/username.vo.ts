import { ValidationError } from '../../../../shared/domain/errors';

export class Username {
  static readonly MIN = 3;
  static readonly MAX = 30;
  private constructor(readonly value: string) {}

  /** Normaliza (trim + minúsculas) e valida. */
  static create(raw: unknown): Username {
    if (typeof raw !== 'string') throw new ValidationError('Usuário é obrigatório');
    const v = raw.trim().toLowerCase();
    if (v.length < Username.MIN || v.length > Username.MAX) {
      throw new ValidationError(
        `Usuário deve ter entre ${Username.MIN} e ${Username.MAX} caracteres`,
      );
    }
    if (!/^[a-z0-9._-]+$/.test(v)) {
      throw new ValidationError(
        'Usuário deve conter apenas letras sem acento, números, ponto, hífen ou sublinhado',
      );
    }
    return new Username(v);
  }
}
