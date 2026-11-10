import { randomUUID } from 'node:crypto';
import { FakeClock, makeRepo, seedGroup } from '../../testing/fixtures';
import { RegisterPaymentUseCase } from './register-payment.use-case';

describe('RegisterPaymentUseCase', () => {
  async function setup() {
    const repo = makeRepo();
    const s = await seedGroup(repo);
    return { repo, s, uc: new RegisterPaymentUseCase(repo, new FakeClock()) };
  }

  it('registra pagamento parcial; mais recente primeiro', async () => {
    const { s, uc } = await setup();
    const input = { groupId: s.gid, fromId: s.cadu.id.value, toId: s.ana.id.value };
    await uc.execute({ ...input, amountCents: 1500 });
    const out = await uc.execute({ ...input, amountCents: 500 });
    expect(out.payments.map((p) => p.amountCents)).toEqual([500, 1500]);
    expect(out.payments[0]).toMatchObject({ fromId: s.cadu.id.value, toId: s.ana.id.value });
  });

  it('409 acima do devido', async () => {
    const { s, uc } = await setup();
    await expect(
      uc.execute({ groupId: s.gid, fromId: s.cadu.id.value, toId: s.ana.id.value, amountCents: 4001 }),
    ).rejects.toMatchObject({ kind: 'conflict', message: 'Valor acima do devido: o máximo para este pagamento é R$ 40,00' });
  });

  it('400 para regras 3.1–3.4, ids e valor', async () => {
    const { s, uc } = await setup();
    const base = { groupId: s.gid, fromId: s.cadu.id.value, toId: s.ana.id.value, amountCents: 100 };
    for (const b of [
      { toId: s.cadu.id.value },
      { toId: randomUUID() },
      { fromId: s.ana.id.value, toId: s.bia.id.value },
      { toId: s.bia.id.value },
      { fromId: 'x' },
      { amountCents: 0 },
      { amountCents: 10.5 },
    ]) {
      await expect(uc.execute({ ...base, ...b })).rejects.toMatchObject({ kind: 'validation' });
    }
  });

  it('404 rolê inexistente', async () => {
    const { s, uc } = await setup();
    await expect(
      uc.execute({ groupId: randomUUID(), fromId: s.cadu.id.value, toId: s.ana.id.value, amountCents: 1 }),
    ).rejects.toMatchObject({ kind: 'not_found' });
  });
});
