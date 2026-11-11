import { ConflictError, NotFoundError, ValidationError } from '../../../shared/domain/errors';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Person } from '../../people/domain/person.entity';
import { Expense, ExpenseParticipant } from './entities/expense.entity';
import { Member } from './entities/member.entity';
import { Payment } from './entities/payment.entity';
import {
  Balance,
  computeBalances,
  computeSettlement,
  SettlementResult,
} from './services/settlement.service';
import { AmountCents } from './value-objects/amount-cents.vo';
import { ExpenseDescription } from './value-objects/expense-description.vo';
import { GroupName } from './value-objects/group-name.vo';
import { Money } from './value-objects/money.vo';

export interface GroupSnapshot {
  id: UniqueEntityId;
  name: GroupName;
  createdAt: Date;
  members: Member[];
  expenses: Expense[];
  payments: Payment[];
}

export interface NewExpenseInput {
  description: ExpenseDescription;
  amount: AmountCents;
  payerId: UniqueEntityId;
  participants: ExpenseParticipant[];
  createdAt: Date;
}

/** Raiz do aggregate Rolê: membros, despesas e pagamentos (em ordem de inserção). */
export class Group {
  private constructor(
    readonly id: UniqueEntityId,
    private _name: GroupName,
    readonly createdAt: Date,
    private readonly _members: Member[],
    private readonly _expenses: Expense[],
    private readonly _payments: Payment[],
  ) {}

  static create(props: { name: GroupName }, createdAt: Date, id?: UniqueEntityId): Group {
    return new Group(id ?? UniqueEntityId.create(), props.name, createdAt, [], [], []);
  }

  /** Reconstitui a partir da persistência (dados já válidos). */
  static restore(s: GroupSnapshot): Group {
    return new Group(s.id, s.name, s.createdAt, [...s.members], [...s.expenses], [...s.payments]);
  }

  get name(): GroupName {
    return this._name;
  }

  rename(name: GroupName): void {
    this._name = name;
  }

  get members(): readonly Member[] {
    return this._members;
  }

  get expenses(): readonly Expense[] {
    return this._expenses;
  }

  get payments(): readonly Payment[] {
    return this._payments;
  }

  get totalCents(): number {
    return this._expenses.reduce((acc, e) => acc + e.amount.value, 0);
  }

  private findMember(id: UniqueEntityId): Member | undefined {
    return this._members.find((m) => m.id.equals(id));
  }

  addMember(person: Person): Member {
    if (this.findMember(person.id)) {
      throw new ConflictError(`${person.name.value} já está neste rolê`);
    }
    const member = Member.fromPerson(person);
    this._members.push(member);
    return member;
  }

  removeMember(memberId: UniqueEntityId): void {
    const idx = this._members.findIndex((m) => m.id.equals(memberId));
    if (idx < 0) throw new NotFoundError('Pessoa não encontrada neste rolê');
    const inExpense = this._expenses.some(
      (e) => e.payerId.equals(memberId) || e.participants.some((p) => p.memberId.equals(memberId)),
    );
    if (inExpense) {
      throw new ConflictError('Não é possível remover uma pessoa que participa de alguma despesa');
    }
    if (this._payments.some((p) => p.involves(memberId))) {
      throw new ConflictError('Não é possível remover uma pessoa com pagamento registrado');
    }
    this._members.splice(idx, 1);
  }

  addExpense(input: NewExpenseInput): Expense {
    if (!this.findMember(input.payerId)) {
      throw new ValidationError('Quem pagou precisa ser uma pessoa do rolê');
    }
    if (input.participants.length < 1) {
      throw new ValidationError('A despesa precisa de ao menos um participante');
    }
    const seen = new Set<string>();
    for (const p of input.participants) {
      if (!this.findMember(p.memberId)) {
        throw new ValidationError('Todos os participantes precisam ser pessoas do rolê');
      }
      if (seen.has(p.memberId.value)) throw new ValidationError('Participantes repetidos');
      seen.add(p.memberId.value);
    }
    const expense = Expense.create(input);
    this._expenses.push(expense);
    return expense;
  }

  removeExpense(expenseId: UniqueEntityId): void {
    const idx = this._expenses.findIndex((e) => e.id.equals(expenseId));
    if (idx < 0) throw new NotFoundError('Despesa não encontrada neste rolê');
    this._expenses.splice(idx, 1);
  }

  registerPayment(
    fromId: UniqueEntityId,
    toId: UniqueEntityId,
    amount: AmountCents,
    createdAt: Date,
  ): Payment {
    if (fromId.equals(toId)) {
      throw new ValidationError('Quem paga e quem recebe precisam ser pessoas diferentes');
    }
    const from = this.findMember(fromId);
    const to = this.findMember(toId);
    if (!from || !to) {
      throw new ValidationError('Quem paga e quem recebe precisam ser pessoas do rolê');
    }
    const balances = this.balances();
    const balanceOf = (m: Member): number =>
      balances.find((b) => b.memberId === m.id.value)?.balanceCents ?? 0;
    const fromBalance = balanceOf(from);
    const toBalance = balanceOf(to);
    if (fromBalance >= 0) {
      throw new ValidationError(`${from.name.value} não tem saldo devedor neste rolê`);
    }
    if (toBalance <= 0) {
      throw new ValidationError(`${to.name.value} não tem valor a receber neste rolê`);
    }
    const max = Math.min(-fromBalance, toBalance);
    if (amount.value > max) {
      const text = Money.fromCents(max).toDecimalString().replace('.', ',');
      throw new ConflictError(`Valor acima do devido: o máximo para este pagamento é R$ ${text}`);
    }
    const payment = Payment.create({ fromId, toId, amount, createdAt });
    this._payments.push(payment);
    return payment;
  }

  removePayment(paymentId: UniqueEntityId): void {
    const idx = this._payments.findIndex((p) => p.id.equals(paymentId));
    if (idx < 0) throw new NotFoundError('Pagamento não encontrado neste rolê');
    this._payments.splice(idx, 1);
  }

  private settlementInputs() {
    return {
      members: this._members.map((m) => ({ id: m.id.value, name: m.name.value })),
      expenses: this._expenses.map((e) => ({
        payerId: e.payerId.value,
        amountCents: e.amount.value,
        shares: e.shares().map((s) => ({ memberId: s.memberId.value, shareCents: s.shareCents })),
      })),
      payments: this._payments.map((p) => ({
        fromId: p.fromId.value,
        toId: p.toId.value,
        amountCents: p.amount.value,
      })),
    };
  }

  balances(): Balance[] {
    const i = this.settlementInputs();
    return computeBalances(i.members, i.expenses, i.payments);
  }

  settle(): SettlementResult {
    const i = this.settlementInputs();
    return computeSettlement(i.members, i.expenses, i.payments);
  }
}
