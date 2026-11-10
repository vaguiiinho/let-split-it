/** Erro base do domínio. `kind` permite à apresentação mapear para HTTP sem conhecer as subclasses. */
export abstract class DomainError extends Error {
  abstract readonly kind: 'validation' | 'not_found' | 'conflict';
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Violação de invariante / entrada inválida (→ 400). */
export class ValidationError extends DomainError {
  readonly kind = 'validation' as const;
}

/** Recurso inexistente (→ 404). */
export class NotFoundError extends DomainError {
  readonly kind = 'not_found' as const;
}

/** Conflito com o estado atual (→ 409). */
export class ConflictError extends DomainError {
  readonly kind = 'conflict' as const;
}
