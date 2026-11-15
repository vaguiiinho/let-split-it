import { DomainError } from './domain-error';

/** Autenticado, mas sem permissão (→ 403). */
export class ForbiddenError extends DomainError {
  readonly kind = 'forbidden' as const;
}
