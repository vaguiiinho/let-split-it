import { randomUUID } from 'node:crypto';
import { makeRepo, seedGroup } from '../../testing/fixtures';
import { RemoveMemberUseCase } from './remove-member.use-case';

describe('RemoveMemberUseCase', () => {
  it('remove pessoa sem vínculos', async () => {
    const repo = makeRepo();
    const { gid, cadu } = await seedGroup(repo, false);
    const out = await new RemoveMemberUseCase(repo).execute({ groupId: gid, memberId: cadu.id.value });
    expect(out.members.map((m) => m.name)).toEqual(['Ana', 'Bia']);
  });

  it('409 com despesa, 404 inexistentes, 400 id inválido', async () => {
    const repo = makeRepo();
    const { gid, ana } = await seedGroup(repo);
    const uc = new RemoveMemberUseCase(repo);
    await expect(uc.execute({ groupId: gid, memberId: ana.id.value })).rejects.toMatchObject({ kind: 'conflict' });
    await expect(uc.execute({ groupId: gid, memberId: randomUUID() })).rejects.toMatchObject({ kind: 'not_found' });
    await expect(uc.execute({ groupId: randomUUID(), memberId: ana.id.value })).rejects.toMatchObject({ kind: 'not_found' });
    await expect(uc.execute({ groupId: gid, memberId: 'x' })).rejects.toMatchObject({ kind: 'validation' });
  });

  it('409 com pagamento registrado', async () => {
    const repo = makeRepo();
    const { gid, cadu, group } = await seedGroup(repo);
    const { AmountCents } = await import('../../domain/value-objects/amount-cents.vo');
    group.registerPayment(cadu.id, group.members[0].id, AmountCents.create(100), new Date());
    group.removeExpense(group.expenses[1].id);
    group.removeExpense(group.expenses[0].id);
    await repo.save(group);
    await expect(
      new RemoveMemberUseCase(repo).execute({ groupId: gid, memberId: cadu.id.value }),
    ).rejects.toMatchObject({ kind: 'conflict', message: 'Não é possível remover uma pessoa com pagamento registrado' });
  });
});
