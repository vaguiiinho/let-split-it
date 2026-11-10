import { randomUUID } from 'node:crypto';
import { FakeClock, makeRepo, seedGroup } from '../../testing/fixtures';
import { AddExpenseInput, AddExpenseUseCase } from './add-expense.use-case';

describe('AddExpenseUseCase', () => {
  async function setup() {
    const repo = makeRepo();
    const s = await seedGroup(repo, false);
    const base: AddExpenseInput = {
      groupId: s.gid,
      description: 'Pizza',
      amountCents: 1000,
      payerId: s.ana.id.value,
      participants: [{ memberId: s.ana.id.value }, { memberId: s.bia.id.value }],
    };
    return { uc: new AddExpenseUseCase(repo, new FakeClock()), base, s };
  }

  it('adiciona despesa com divisão por pesos', async () => {
    const { uc, base, s } = await setup();
    const out = await uc.execute({
      ...base,
      amountCents: 100,
      participants: [{ memberId: s.ana.id.value, weight: 2 }, { memberId: s.bia.id.value }],
    });
    expect(out.totalCents).toBe(100);
    expect(out.expenses[0].participants.map((p) => p.shareCents)).toEqual([67, 33]);
  });

  it('400 para entradas inválidas', async () => {
    const { uc, base, s } = await setup();
    const bad: Partial<AddExpenseInput>[] = [
      { amountCents: 0 },
      { amountCents: 10.5 },
      { description: '' },
      { payerId: 'nao-existe' },
      { payerId: randomUUID() },
      { participants: [] },
      { participants: [{ memberId: randomUUID() }] },
      { participants: [{ memberId: s.ana.id.value }, { memberId: s.ana.id.value }] },
      { participants: [{ memberId: s.ana.id.value, weight: 0 }] },
    ];
    for (const b of bad) {
      await expect(uc.execute({ ...base, ...b })).rejects.toMatchObject({ kind: 'validation' });
    }
  });

  it('404 rolê inexistente', async () => {
    const { uc, base } = await setup();
    await expect(uc.execute({ ...base, groupId: randomUUID() })).rejects.toMatchObject({ kind: 'not_found' });
  });
});
