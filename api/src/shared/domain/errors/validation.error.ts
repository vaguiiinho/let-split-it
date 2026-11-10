import { DomainError } from './domain-error';

/** Violação de invariante / entrada inválida (→ 400). */
export class ValidationError extends DomainError {
  readonly kind = 'validation' as const;
}
