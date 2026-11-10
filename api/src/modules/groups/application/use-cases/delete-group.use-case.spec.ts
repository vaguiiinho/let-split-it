import { randomUUID } from 'node:crypto';
import { makeRepo, seedGroup } from '../../testing/fixtures';
import { DeleteGroupUseCase } from './delete-group.use-case';

describe('DeleteGroupUseCase', () => {
  it('remove o rolê', async () => {
    const repo = makeRepo();
    const { gid } = await seedGroup(repo);
    const uc = new DeleteGroupUseCase(repo);
    await expect(uc.execute({ groupId: gid })).resolves.toBeUndefined();
    await expect(uc.execute({ groupId: gid })).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('400 id inválido, 404 inexistente', async () => {
    const uc = new DeleteGroupUseCase(makeRepo());
    await expect(uc.execute({ groupId: 'x' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ groupId: randomUUID() })).rejects.toMatchObject({ kind: 'not_found' });
  });
});
