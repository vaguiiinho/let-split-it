import { makeUser, makeUserRepo } from '../../../users/testing/fixtures';
import { FakeClock, makeRepo } from '../../testing/fixtures';
import { CreateGroupUseCase } from './create-group.use-case';

async function setup() {
  const repo = makeRepo();
  const repos = makeUserRepo();
  const ana = await makeUser(repos, 'ana');
  return { repo, ana, uc: new CreateGroupUseCase(repo, repos.people, new FakeClock()) };
}

describe('CreateGroupUseCase', () => {
  it('cria e persiste o rolê com dono e a pessoa do ator como primeiro membro (R5)', async () => {
    const { repo, ana, uc } = await setup();
    const out = await uc.execute({ actor: ana.actor, name: '  Churras ' });
    expect(out).toMatchObject({
      name: 'Churras',
      ownerId: ana.actor.userId,
      totalCents: 0,
      expenses: [],
      payments: [],
    });
    expect(out.members[0]).toMatchObject({ id: ana.actor.personId, name: 'ana' });
    expect(await repo.listSummaries({ kind: 'all' })).toHaveLength(1);
    const saved = await repo.findById((await repo.findAll({ kind: 'all' }))[0].id);
    expect(saved?.ownerId?.value).toBe(ana.actor.userId);
    expect(saved?.ownerPersonId?.value).toBe(ana.actor.personId);
  });

  it('400 para nome inválido', async () => {
    const { ana, uc } = await setup();
    await expect(uc.execute({ actor: ana.actor, name: '  ' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ actor: ana.actor, name: 'a'.repeat(61) })).rejects.toMatchObject({ kind: 'validation' });
  });
});
