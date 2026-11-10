import { randomUUID } from 'node:crypto';
import { FakeClock, makeRepo, seedGroup } from '../../testing/fixtures';
import { RegisterPaymentUseCase } from './register-payment.use-case';
import { RemovePaymentUseCase } from './remove-payment.use-case';

describe('RemovePaymentUseCase', () => {
  it('desfaz o pagamento', async () => {
    const repo = makeRepo();
    const s = await seedGroup(repo);
    const paid = await new RegisterPaymentUseCase(repo, new FakeClock()).execute({
      groupId: s.gid,
      fromId: s.cadu.id.value,
      toId: s.ana.id.value,
      amountCents: 1000,
    });
    const out = await new RemovePaymentUseCase(repo).execute({ groupId: s.gid, paymentId: paid.payments[0].id });
    expect(out.payments).toEqual([]);
  });

  it('400 id inválido, 404 pagamento/rolê', async () => {
    const repo = makeRepo();
    const { gid } = await seedGroup(repo);
    const uc = new RemovePaymentUseCase(repo);
    await expect(uc.execute({ groupId: gid, paymentId: 'x' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ groupId: gid, paymentId: randomUUID() })).rejects.toMatchObject({
      kind: 'not_found',
      message: 'Pagamento não encontrado neste rolê',
    });
    await expect(uc.execute({ groupId: randomUUID(), paymentId: randomUUID() })).rejects.toMatchObject({
      kind: 'not_found',
      message: 'Rolê não encontrado',
    });
  });
});
