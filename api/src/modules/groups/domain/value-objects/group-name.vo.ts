import { requireText } from './text';

export class GroupName {
  static readonly MAX = 60;
  private constructor(readonly value: string) {}

  static create(raw: unknown): GroupName {
    return new GroupName(requireText(raw, 'Nome do rolê', GroupName.MAX));
  }
}
