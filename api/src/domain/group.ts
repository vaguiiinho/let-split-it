import { ConflictError, NotFoundError, ValidationError } from './errors';
import { splitByWeights } from './split';
import { computeSettlement, SettlementResult } from './settlement';

export const LIMITS = {
  groupName: 60,
  memberName: 40,
  pixKey: 77,
  description: 80,
  maxAmountCents: 100_000_000,
  minWeight: 1,
  maxWeight: 100,
} as const;

export interface Member {
  readonly id: string;
  readonly name: string;
  readonly pixKey: string | null;
}

export interface Participant {
  readonly memberId: string;
  readonly weight: number;
}

export interface Expense {
  readonly id: string;
  readonly description: string;
  readonly amountCents: number;
  readonly payerId: string;
  readonly createdAt: Date;
  readonly participants: readonly Participant[];
}

export interface ExpenseShare extends Participant {
  readonly shareCents: number;
}

export interface GroupSnapshot {
  id: string;
  name: string;
  createdAt: Date;
  members: Member[];
  expenses: Expense[];
}

export interface NewExpenseInput {
  id: string;
  description: string;
  amountCents: number;
  payerId: string;
  participants: { memberId: string; weight?: number }[];
  createdAt: Date;
}

function requireText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') throw new ValidationError(`${field} é obrigatório`);
  const v = value.trim();
  if (v.length < 1 || v.length > max) {
    throw new ValidationError(`${field} deve ter entre 1 e ${max} caracteres`);
  }
  return v;
}

/** Aggregate Rolê: membros + despesas, com invariantes. Membros/despesas em ordem de inserção. */
export class Group {
  private constructor(
    readonly id: string,
    private _name: string,
    readonly createdAt: Date,
    private readonly _members: Member[],
    private readonly _expenses: Expense[],
  ) {}

  static create(id: string, name: string, createdAt: Date): Group {
    return new Group(id, requireText(name, 'Nome do rolê', LIMITS.groupName), createdAt, [], []);
  }

  /** Reconstitui a partir da persistência (dados já válidos). */
  static restore(s: GroupSnapshot): Group {
    return new Group(s.id, s.name, s.createdAt, [...s.members], [...s.expenses]);
  }

  get name(): string {
    return this._name;
  }

  get members(): readonly Member[] {
    return this._members;
  }

  get expenses(): readonly Expense[] {
    return this._expenses;
  }

  get totalCents(): number {
    return this._expenses.reduce((acc, e) => acc + e.amountCents, 0);
  }

  hasMember(memberId: string): boolean {
    return this._members.some((m) => m.id === memberId);
  }

  addMember(id: string, name: string, pixKey?: string | null): Member {
    const clean = requireText(name, 'Nome da pessoa', LIMITS.memberName);
    let key: string | null = null;
    if (pixKey !== undefined && pixKey !== null) {
      if (typeof pixKey !== 'string') throw new ValidationError('Chave PIX inválida');
      key = pixKey.trim() || null;
      if (key && key.length > LIMITS.pixKey) {
        throw new ValidationError(`Chave PIX deve ter no máximo ${LIMITS.pixKey} caracteres`);
      }
      // Chaves PIX (CPF/CNPJ, e-mail, telefone, aleatória) são sempre ASCII imprimível;
      // isso também garante que o campo TLV (medido em bytes) caiba no BR Code.
      if (key && !/^[\x21-\x7E]+$/.test(key)) {
        throw new ValidationError('Chave PIX deve conter apenas letras sem acento, números e símbolos (sem espaços)');
      }
    }
    const lower = clean.toLocaleLowerCase('pt-BR');
    if (this._members.some((m) => m.name.toLocaleLowerCase('pt-BR') === lower)) {
      throw new ConflictError(`Já existe uma pessoa chamada "${clean}" neste rolê`);
    }
    const member: Member = { id, name: clean, pixKey: key };
    this._members.push(member);
    return member;
  }

  removeMember(memberId: string): void {
    const idx = this._members.findIndex((m) => m.id === memberId);
    if (idx < 0) throw new NotFoundError('Pessoa não encontrada neste rolê');
    const involved = this._expenses.some(
      (e) => e.payerId === memberId || e.participants.some((p) => p.memberId === memberId),
    );
    if (involved) {
      throw new ConflictError('Não é possível remover uma pessoa que participa de alguma despesa');
    }
    this._members.splice(idx, 1);
  }

  addExpense(input: NewExpenseInput): Expense {
    const description = requireText(input.description, 'Descrição', LIMITS.description);
    const amount = input.amountCents;
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > LIMITS.maxAmountCents) {
      throw new ValidationError(
        `Valor deve ser um inteiro de centavos entre 1 e ${LIMITS.maxAmountCents}`,
      );
    }
    if (!this.hasMember(input.payerId)) {
      throw new ValidationError('Quem pagou precisa ser uma pessoa do rolê');
    }
    if (!Array.isArray(input.participants) || input.participants.length < 1) {
      throw new ValidationError('A despesa precisa de ao menos um participante');
    }
    const seen = new Set<string>();
    const participants: Participant[] = input.participants.map((p) => {
      if (!this.hasMember(p.memberId)) {
        throw new ValidationError('Todos os participantes precisam ser pessoas do rolê');
      }
      if (seen.has(p.memberId)) throw new ValidationError('Participantes repetidos');
      seen.add(p.memberId);
      const weight = p.weight ?? 1;
      if (!Number.isInteger(weight) || weight < LIMITS.minWeight || weight > LIMITS.maxWeight) {
        throw new ValidationError(
          `Peso deve ser inteiro entre ${LIMITS.minWeight} e ${LIMITS.maxWeight}`,
        );
      }
      return { memberId: p.memberId, weight };
    });
    const expense: Expense = {
      id: input.id,
      description,
      amountCents: amount,
      payerId: input.payerId,
      createdAt: input.createdAt,
      participants,
    };
    this._expenses.push(expense);
    return expense;
  }

  removeExpense(expenseId: string): void {
    const idx = this._expenses.findIndex((e) => e.id === expenseId);
    if (idx < 0) throw new NotFoundError('Despesa não encontrada neste rolê');
    this._expenses.splice(idx, 1);
  }

  static sharesOf(expense: Expense): ExpenseShare[] {
    const shares = splitByWeights(
      expense.amountCents,
      expense.participants.map((p) => p.weight),
    );
    return expense.participants.map((p, i) => ({ ...p, shareCents: shares[i] }));
  }

  settle(): SettlementResult {
    return computeSettlement(
      this._members,
      this._expenses.map((e) => ({
        payerId: e.payerId,
        amountCents: e.amountCents,
        shares: Group.sharesOf(e),
      })),
    );
  }
}
