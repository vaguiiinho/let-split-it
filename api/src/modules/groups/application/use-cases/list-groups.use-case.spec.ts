import { Group } from '../../domain/group.aggregate';
import { GroupName } from '../../domain/value-objects/group-name.vo';
import { makeRepo, seedGroup } from '../../testing/fixtures';
import { ListGroupsUseCase } from './list-groups.use-case';

describe('ListGroupsUseCase', () => {
  it('lista do mais recente ao mais antigo, com createdAt ISO e totais', async () => {
    const repo = makeRepo();
    await seedGroup(repo);
    await repo.save(Group.create({ name: GroupName.create('Novo') }, new Date(Date.UTC(2026, 5, 1))));
    const out = await new ListGroupsUseCase(repo).execute({});
    expect(out.map((g) => g.name)).toEqual(['Novo', 'Churras']);
    expect(out[1]).toMatchObject({ memberCount: 3, expenseCount: 2, totalCents: 12000 });
    expect(typeof out[0].createdAt).toBe('string');
  });

  it('lista vazia', async () => {
    expect(await new ListGroupsUseCase(makeRepo()).execute({})).toEqual([]);
  });
});
