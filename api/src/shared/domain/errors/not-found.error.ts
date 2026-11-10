import { DomainError } from './domain-error';

/** Recurso inexistente (→ 404). */
export class NotFoundError extends DomainError {
  readonly kind = 'not_found' as const;
}
