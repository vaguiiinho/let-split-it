import { requireText } from '../../../../shared/domain/value-objects/text';

export class PersonName {
  static readonly MAX = 40;
  private constructor(readonly value: string) {}

  static create(raw: unknown): PersonName {
    return new PersonName(requireText(raw, 'Nome da pessoa', PersonName.MAX));
  }

  /** Chave de unicidade global (trim + minúsculas pt-BR). */
  get key(): string {
    return this.value.trim().toLocaleLowerCase('pt-BR');
  }

  equalsIgnoreCase(other: PersonName): boolean {
    return this.key === other.key;
  }
}
