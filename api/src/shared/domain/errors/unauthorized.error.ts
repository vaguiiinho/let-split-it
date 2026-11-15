import { DomainError } from './domain-error';

/** Não autenticado ou sessão inválida (→ 401). */
export class UnauthorizedError extends DomainError {
  readonly kind = 'unauthorized' as const;
}
