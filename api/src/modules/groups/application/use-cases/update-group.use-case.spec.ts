import { randomUUID } from 'node:crypto';
import { makeRepo, seedGroup } from '../../testing/fixtures';
import { UpdateGroupUseCase } from './update-group.use-case';

describe('UpdateGroupUseCase', () => {
  it('renomeia e persiste', async () => {
    const repo = makeRepo();
    const { gid } = await seedGroup(repo, false);
    const out = await new UpdateGroupUseCase(repo).execute({ groupId: gid, name: ' Praia ' });
    expect(out.name).toBe('Praia');
    expect(out.members).toHaveLength(3);
    expect((await repo.findAll())[0].name.value).toBe('Praia');
  });

  it('400 nome/id inválidos, 404 rolê inexistente', async () => {
    const repo = makeRepo();
    const { gid } = await seedGroup(repo, false);
    const uc = new UpdateGroupUseCase(repo);
    await expect(uc.execute({ groupId: gid, name: '  ' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ groupId: 'x', name: 'A' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ groupId: randomUUID(), name: 'A' })).rejects.toMatchObject({ kind: 'not_found' });
  });
});
