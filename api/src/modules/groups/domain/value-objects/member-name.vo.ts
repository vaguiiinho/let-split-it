import { requireText } from './text';

export class MemberName {
  static readonly MAX = 40;
  private constructor(readonly value: string) {}

  static create(raw: unknown): MemberName {
    return new MemberName(requireText(raw, 'Nome da pessoa', MemberName.MAX));
  }

  equalsIgnoreCase(other: MemberName): boolean {
    return this.value.toLocaleLowerCase('pt-BR') === other.value.toLocaleLowerCase('pt-BR');
  }
}
