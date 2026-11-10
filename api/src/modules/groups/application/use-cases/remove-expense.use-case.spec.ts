import { randomUUID } from 'node:crypto';
import { makeRepo, seedGroup } from '../../testing/fixtures';
import { RemoveExpenseUseCase } from './remove-expense.use-case';

describe('RemoveExpenseUseCase', () => {
  it('remove a despesa', async () => {
    const repo = makeRepo();
    const { gid, group } = await seedGroup(repo);
    const out = await new RemoveExpenseUseCase(repo).execute({ groupId: gid, expenseId: group.expenses[0].id.value });
    expect(out.expenses.map((e) => e.description)).toEqual(['Cerveja']);
    expect(out.totalCents).toBe(3000);
  });

  it('400 id inválido, 404 rolê/despesa', async () => {
    const repo = makeRepo();
    const { gid } = await seedGroup(repo);
    const uc = new RemoveExpenseUseCase(repo);
    await expect(uc.execute({ groupId: gid, expenseId: 'x' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ groupId: gid, expenseId: randomUUID() })).rejects.toMatchObject({ kind: 'not_found' });
    await expect(uc.execute({ groupId: randomUUID(), expenseId: randomUUID() })).rejects.toMatchObject({ kind: 'not_found' });
  });
});
