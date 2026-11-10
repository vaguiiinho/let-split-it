import { FakeClock, makeRepo } from '../../testing/fixtures';
import { CreateGroupUseCase } from './create-group.use-case';

describe('CreateGroupUseCase', () => {
  it('cria e persiste o rolê', async () => {
    const repo = makeRepo();
    const out = await new CreateGroupUseCase(repo, new FakeClock()).execute({ name: '  Churras ' });
    expect(out).toMatchObject({ name: 'Churras', totalCents: 0, members: [], expenses: [], payments: [] });
    expect(await repo.listSummaries()).toHaveLength(1);
  });

  it('400 para nome inválido', async () => {
    const uc = new CreateGroupUseCase(makeRepo(), new FakeClock());
    await expect(uc.execute({ name: '  ' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ name: 'a'.repeat(61) })).rejects.toMatchObject({ kind: 'validation' });
  });
});
