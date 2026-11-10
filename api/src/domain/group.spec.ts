import { Group } from './group';
import { ConflictError, NotFoundError, ValidationError } from './errors';

function makeGroup() {
  const g = Group.create('g', '  Viagem  ', new Date());
  g.addMember('a', 'Ana', 'ana@pix.com');
  g.addMember('b', 'Bia');
  return g;
}

describe('Group aggregate', () => {
  it('valida nome do rolê (trim, 1–60)', () => {
    expect(makeGroup().name).toBe('Viagem');
    expect(() => Group.create('x', '   ', new Date())).toThrow(ValidationError);
    expect(() => Group.create('x', 'a'.repeat(61), new Date())).toThrow(ValidationError);
  });

  it('nome de pessoa único case-insensitive → conflito', () => {
    const g = makeGroup();
    expect(() => g.addMember('c', ' ana ')).toThrow(ConflictError);
    expect(() => g.addMember('c', 'x'.repeat(41))).toThrow(ValidationError);
    expect(() => g.addMember('c', 'Cris', 'k'.repeat(78))).toThrow(ValidationError);
  });

  it('valida despesa', () => {
    const g = makeGroup();
    const base = { id: 'e', description: 'Pizza', amountCents: 100, payerId: 'a', participants: [{ memberId: 'a' }], createdAt: new Date() };
    expect(() => g.addExpense({ ...base, amountCents: 0 })).toThrow(ValidationError);
    expect(() => g.addExpense({ ...base, amountCents: 100_000_001 })).toThrow(ValidationError);
    expect(() => g.addExpense({ ...base, payerId: 'zz' })).toThrow(ValidationError);
    expect(() => g.addExpense({ ...base, participants: [] })).toThrow(ValidationError);
    expect(() => g.addExpense({ ...base, participants: [{ memberId: 'a' }, { memberId: 'a' }] })).toThrow(ValidationError);
    expect(() => g.addExpense({ ...base, participants: [{ memberId: 'a', weight: 101 }] })).toThrow(ValidationError);
    expect(() => g.addExpense({ ...base, description: '' })).toThrow(ValidationError);
    const e = g.addExpense(base);
    expect(e.participants[0].weight).toBe(1);
  });

  it('não remove pessoa envolvida em despesa; remove após apagar a despesa', () => {
    const g = makeGroup();
    g.addExpense({ id: 'e', description: 'Uber', amountCents: 100, payerId: 'a', participants: [{ memberId: 'b' }], createdAt: new Date() });
    expect(() => g.removeMember('b')).toThrow(ConflictError);
    expect(() => g.removeMember('a')).toThrow(ConflictError);
    expect(() => g.removeMember('zz')).toThrow(NotFoundError);
    g.removeExpense('e');
    g.removeMember('b');
    expect(g.members.map((m) => m.id)).toEqual(['a']);
    expect(() => g.removeExpense('e')).toThrow(NotFoundError);
  });
});

describe('Group — chave PIX', () => {
  it('rejeita chave PIX com acentos, emoji ou espaços', () => {
    const g = Group.create('g', 'Rolê', new Date());
    expect(() => g.addMember('x', 'X', 'joão@pix.com')).toThrow(/Chave PIX/);
    expect(() => g.addMember('y', 'Y', '😀😀')).toThrow(/Chave PIX/);
    expect(() => g.addMember('z', 'Z', 'a b@c.com')).toThrow(/Chave PIX/);
    expect(() => g.addMember('w', 'W', '+5511999998888')).not.toThrow();
  });
});
