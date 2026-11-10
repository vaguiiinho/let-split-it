import { ConflictError, NotFoundError, ValidationError } from '../../../shared/domain/errors';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Group } from './group.aggregate';
import { AmountCents } from './value-objects/amount-cents.vo';
import { ExpenseDescription } from './value-objects/expense-description.vo';
import { GroupName } from './value-objects/group-name.vo';
import { MemberName } from './value-objects/member-name.vo';
import { PixKey } from './value-objects/pix-key.vo';
import { Weight } from './value-objects/weight.vo';

const now = new Date();

function setup() {
  const g = Group.create({ name: GroupName.create('  Viagem  ') }, now);
  const ana = g.addMember(MemberName.create('Ana'), PixKey.createOptional('ana@pix.com'));
  const bia = g.addMember(MemberName.create('Bia'), null);
  const cadu = g.addMember(MemberName.create('Cadu'), null);
  const all = [ana, bia, cadu].map((m) => ({ memberId: m.id, weight: Weight.create() }));
  const expense = (v: number, payerId: UniqueEntityId, participants = all) => ({
    description: ExpenseDescription.create('Pizza'),
    amount: AmountCents.create(v),
    payerId,
    participants,
    createdAt: now,
  });
  return { g, ana, bia, cadu, all, expense };
}

describe('Group aggregate', () => {
  it('cria com nome normalizado e id v4', () => {
    const { g } = setup();
    expect(g.name.value).toBe('Viagem');
    expect(Group.create({ name: g.name }, now, g.id).id.equals(g.id)).toBe(true);
  });

  it('nome de pessoa único case-insensitive → conflito', () => {
    const { g } = setup();
    expect(() => g.addMember(MemberName.create(' ana '), null)).toThrow(ConflictError);
  });

  it('valida membros em despesas', () => {
    const { g, ana, expense } = setup();
    const stranger = UniqueEntityId.create();
    expect(() => g.addExpense(expense(100, stranger))).toThrow('Quem pagou precisa ser uma pessoa do rolê');
    expect(() => g.addExpense(expense(100, ana.id, []))).toThrow('ao menos um participante');
    expect(() => g.addExpense(expense(100, ana.id, [{ memberId: stranger, weight: Weight.create() }]))).toThrow(
      'Todos os participantes precisam ser pessoas do rolê',
    );
    const dup = { memberId: ana.id, weight: Weight.create() };
    expect(() => g.addExpense(expense(100, ana.id, [dup, dup]))).toThrow('Participantes repetidos');
    expect(g.expenses).toHaveLength(0);
  });

  it('remove pessoa: despesa → 409; sem vínculo → ok; inexistente → 404', () => {
    const { g, ana, bia, cadu, expense } = setup();
    g.addExpense(expense(100, ana.id, [{ memberId: bia.id, weight: Weight.create() }]));
    expect(() => g.removeMember(bia.id)).toThrow('participa de alguma despesa');
    expect(() => g.removeMember(ana.id)).toThrow(ConflictError);
    g.removeMember(cadu.id);
    expect(() => g.removeMember(cadu.id)).toThrow(NotFoundError);
    const e = g.expenses[0];
    g.removeExpense(e.id);
    expect(() => g.removeExpense(e.id)).toThrow('Despesa não encontrada neste rolê');
  });

  describe('pagamentos', () => {
    function withDebts() {
      const s = setup();
      s.g.addExpense(s.expense(9000, s.ana.id));
      s.g.addExpense(s.expense(3000, s.bia.id));
      return s; // saldos [5000, -1000, -4000]
    }
    const pay = (g: Group, from: UniqueEntityId, to: UniqueEntityId, v: number) =>
      g.registerPayment(from, to, AmountCents.create(v), now);

    it('registra pagamento parcial e atualiza saldos', () => {
      const { g, ana, cadu } = withDebts();
      pay(g, cadu.id, ana.id, 1500);
      expect(g.balances().map((b) => b.balanceCents)).toEqual([3500, -1000, -2500]);
      expect(g.settle().transfers.map((t) => t.amountCents)).toEqual([2500, 1000]);
      expect(g.totalCents).toBe(12000);
    });

    it('valida na ordem da spec', () => {
      const { g, ana, bia, cadu } = withDebts();
      expect(() => pay(g, cadu.id, cadu.id, 1)).toThrow('Quem paga e quem recebe precisam ser pessoas diferentes');
      expect(() => pay(g, UniqueEntityId.create(), ana.id, 1)).toThrow('pessoas do rolê');
      expect(() => pay(g, ana.id, bia.id, 1)).toThrow('Ana não tem saldo devedor neste rolê');
      expect(() => pay(g, cadu.id, bia.id, 1)).toThrow('Bia não tem valor a receber neste rolê');
      expect(() => pay(g, cadu.id, ana.id, 4001)).toThrow(
        new ConflictError('Valor acima do devido: o máximo para este pagamento é R$ 40,00'),
      );
      expect(() => pay(g, bia.id, ana.id, 1001)).toThrow('R$ 10,00');
      expect(g.payments).toHaveLength(0);
    });

    it('removePayment e proteção na remoção de pessoa', () => {
      const { g, ana, cadu } = withDebts();
      const p = pay(g, cadu.id, ana.id, 4000);
      g.removeExpense(g.expenses[0].id);
      g.removeExpense(g.expenses[0].id);
      expect(() => g.removeMember(cadu.id)).toThrow('Não é possível remover uma pessoa com pagamento registrado');
      g.removePayment(p.id);
      expect(() => g.removePayment(p.id)).toThrow(new NotFoundError('Pagamento não encontrado neste rolê'));
      g.removeMember(cadu.id);
      expect(g.members).toHaveLength(2);
    });

    it('remover despesa com pagamentos inverte saldos (regra 6)', () => {
      const { g, ana, cadu } = withDebts();
      pay(g, cadu.id, ana.id, 4000);
      g.removeExpense(g.expenses[1].id); // remove Carne
      const b = g.balances();
      expect(b.reduce((s, x) => s + x.balanceCents, 0)).toBe(0);
      expect(b[2].balanceCents).toBeGreaterThan(0);
    });

    it('restore reconstitui o aggregate', () => {
      const { g } = withDebts();
      const r = Group.restore({
        id: g.id,
        name: g.name,
        createdAt: g.createdAt,
        members: [...g.members],
        expenses: [...g.expenses],
        payments: [...g.payments],
      });
      expect(r.totalCents).toBe(12000);
    });
  });

  it('ValidationError é a base para ids inválidos', () => {
    expect(() => UniqueEntityId.create('x')).toThrow(ValidationError);
  });
});
