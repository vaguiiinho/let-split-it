import { randomUUID } from 'node:crypto';
import { makeRepo, seedGroup, ADMIN } from '../../testing/fixtures';
import { GetSettlementUseCase } from './get-settlement.use-case';

describe('GetSettlementUseCase', () => {
  it('calcula saldos, transferências mínimas e PIX', async () => {
    const repo = makeRepo();
    const { gid, ana, bia, cadu } = await seedGroup(repo);
    const out = await new GetSettlementUseCase(repo).execute({ actor: ADMIN, groupId: gid });
    expect(out.totalCents).toBe(12000);
    expect(out.balances.map((b) => b.balanceCents)).toEqual([5000, -1000, -4000]);
    expect(out.balances[0]).toMatchObject({ sentCents: 0, receivedCents: 0 });
    expect(out.transfers).toMatchObject([
      { fromId: cadu.id.value, toId: ana.id.value, amountCents: 4000 },
      { fromId: bia.id.value, toId: ana.id.value, amountCents: 1000 },
    ]);
    expect(out.transfers[0].pixPayload).toContain('540540.00');
  });

  it('pixPayload nulo quando o recebedor não tem chave; 400/404', async () => {
    const repo = makeRepo();
    const { gid } = await seedGroup(repo, false);
    const uc = new GetSettlementUseCase(repo);
    expect((await uc.execute({ actor: ADMIN, groupId: gid })).transfers).toEqual([]);
    await expect(uc.execute({ actor: ADMIN, groupId: 'x' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ actor: ADMIN, groupId: randomUUID() })).rejects.toMatchObject({ kind: 'not_found' });
  });
});
