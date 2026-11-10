import { requireText } from './text';

export class ExpenseDescription {
  static readonly MAX = 80;
  private constructor(readonly value: string) {}

  static create(raw: unknown): ExpenseDescription {
    return new ExpenseDescription(requireText(raw, 'Descrição', ExpenseDescription.MAX));
  }
}
