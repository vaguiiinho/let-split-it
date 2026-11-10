import { DomainError } from './domain-error';

/** Conflito com o estado atual (→ 409). */
export class ConflictError extends DomainError {
  readonly kind = 'conflict' as const;
}
