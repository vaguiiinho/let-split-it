import { randomUUID } from 'node:crypto';
import { makeRepo, seedGroup } from '../../testing/fixtures';
import { GetGroupUseCase } from './get-group.use-case';

describe('GetGroupUseCase', () => {
  it('retorna o detalhe com despesas do mais recente ao mais antigo', async () => {
    const repo = makeRepo();
    const { gid } = await seedGroup(repo);
    const out = await new GetGroupUseCase(repo).execute({ groupId: gid });
    expect(out.expenses.map((e) => e.description)).toEqual(['Cerveja', 'Carne']);
    expect(out.totalCents).toBe(12000);
    expect(out.members[0]).toMatchObject({ name: 'Ana', pixKey: 'ana@pix.com' });
  });

  it('400 id inválido, 404 inexistente', async () => {
    const uc = new GetGroupUseCase(makeRepo());
    await expect(uc.execute({ groupId: 'nao-existe' })).rejects.toMatchObject({ kind: 'validation', message: 'Identificador inválido' });
    await expect(uc.execute({ groupId: randomUUID() })).rejects.toMatchObject({ kind: 'not_found', message: 'Rolê não encontrado' });
  });
});
