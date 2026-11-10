/** Erro base do domínio. `kind` permite à apresentação mapear para HTTP sem conhecer as subclasses. */
export abstract class DomainError extends Error {
  abstract readonly kind: 'validation' | 'not_found' | 'conflict';
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
