import { randomUUID } from 'node:crypto';
import { makeRepo, seedGroup } from '../../testing/fixtures';
import { AddMemberUseCase } from './add-member.use-case';

describe('AddMemberUseCase', () => {
  it('adiciona pessoa com e sem PIX', async () => {
    const repo = makeRepo();
    const { gid } = await seedGroup(repo, false);
    const uc = new AddMemberUseCase(repo);
    const out = await uc.execute({ groupId: gid, name: ' Dani ', pixKey: '' });
    expect(out.members.at(-1)).toMatchObject({ name: 'Dani', pixKey: null });
    const out2 = await uc.execute({ groupId: gid, name: 'Edu', pixKey: 'edu@pix.com' });
    expect(out2.members.at(-1)?.pixKey).toBe('edu@pix.com');
  });

  it('400 nome/PIX inválidos, 404 rolê, 409 duplicado', async () => {
    const repo = makeRepo();
    const { gid } = await seedGroup(repo, false);
    const uc = new AddMemberUseCase(repo);
    await expect(uc.execute({ groupId: gid, name: '' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ groupId: gid, name: 'X', pixKey: 'a b' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ groupId: randomUUID(), name: 'X' })).rejects.toMatchObject({ kind: 'not_found' });
    await expect(uc.execute({ groupId: gid, name: ' ANA ' })).rejects.toMatchObject({ kind: 'conflict' });
  });
});
