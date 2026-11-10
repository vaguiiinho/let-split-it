import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/shared/infrastructure/prisma.service';

interface Detail {
  id: string;
  name: string;
  totalCents: number;
  members: { id: string; name: string; pixKey: string | null }[];
  expenses: { id: string; description: string; participants: { memberId: string; shareCents: number }[] }[];
  payments: { id: string; fromId: string; toId: string; amountCents: number }[];
}

describe('Racha Aí API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    const prisma = app.get(PrismaService);
    await prisma.group.deleteMany();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('fluxo completo: rolê → pessoas → despesas → acerto com PIX', async () => {
    const created = await http.post('/groups').send({ name: '  Churras  ' }).expect(201);
    const g = created.body as Detail;
    expect(g).toMatchObject({ name: 'Churras', totalCents: 0, members: [], expenses: [] });

    await http.post(`/groups/${g.id}/members`).send({ name: 'Ana', pixKey: 'ana@pix.com' }).expect(201);
    await http.post(`/groups/${g.id}/members`).send({ name: 'Bia' }).expect(201);
    const withC = await http.post(`/groups/${g.id}/members`).send({ name: 'Cadu', pixKey: '' }).expect(201);
    const [a, b, c] = (withC.body as Detail).members;
    expect(a.pixKey).toBe('ana@pix.com');
    expect(b.pixKey).toBeNull();
    expect(c.pixKey).toBeNull();

    const all = [{ memberId: a.id }, { memberId: b.id }, { memberId: c.id }];
    await http
      .post(`/groups/${g.id}/expenses`)
      .send({ description: 'Carne', amountCents: 9000, payerId: a.id, participants: all })
      .expect(201);
    const afterE2 = await http
      .post(`/groups/${g.id}/expenses`)
      .send({ description: 'Cerveja', amountCents: 3000, payerId: b.id, participants: all })
      .expect(201);
    const detail = afterE2.body as Detail;
    expect(detail.totalCents).toBe(12000);
    expect(detail.expenses.map((e) => e.description)).toEqual(['Cerveja', 'Carne']);
    expect(detail.expenses[0].participants.map((p) => p.shareCents)).toEqual([1000, 1000, 1000]);

    const s = await http.get(`/groups/${g.id}/settlement`).expect(200);
    expect(s.body.totalCents).toBe(12000);
    expect(s.body.balances.map((x: { balanceCents: number }) => x.balanceCents)).toEqual([5000, -1000, -4000]);
    expect(s.body.transfers).toHaveLength(2);
    expect(s.body.transfers[0]).toMatchObject({ fromId: c.id, toId: a.id, amountCents: 4000, toName: 'Ana' });
    expect(s.body.transfers[1]).toMatchObject({ fromId: b.id, toId: a.id, amountCents: 1000 });
    expect(s.body.transfers[0].pixPayload).toMatch(/^000201.*br\.gov\.bcb\.pix.*540540\.00.*59\d\dANA.*6304[0-9A-F]{4}$/);

    // pesos + listagem
    await http
      .post(`/groups/${g.id}/expenses`)
      .send({ description: 'Gelo', amountCents: 100, payerId: c.id, participants: [{ memberId: a.id, weight: 2 }, { memberId: b.id }] })
      .expect(201)
      .expect((r) => expect((r.body as Detail).expenses[0].participants.map((p) => p.shareCents)).toEqual([67, 33]));

    const list = await http.get('/groups').expect(200);
    expect(list.body[0]).toMatchObject({ id: g.id, name: 'Churras', memberCount: 3, expenseCount: 3, totalCents: 12100 });

    // remover pessoa envolvida → 409; remover despesa e depois pessoa → 200
    const conflict = await http.delete(`/groups/${g.id}/members/${c.id}`).expect(409);
    expect(conflict.body).toMatchObject({ statusCode: 409, error: 'Conflict' });
    expect(typeof conflict.body.message).toBe('string');

    const cur = (await http.get(`/groups/${g.id}`).expect(200)).body as Detail;
    for (const e of cur.expenses) {
      await http.delete(`/groups/${g.id}/expenses/${e.id}`).expect(200);
    }
    const afterRemove = await http.delete(`/groups/${g.id}/members/${c.id}`).expect(200);
    expect((afterRemove.body as Detail).members).toHaveLength(2);

    const zero = await http.get(`/groups/${g.id}/settlement`).expect(200);
    expect(zero.body.transfers).toEqual([]);

    await http.delete(`/groups/${g.id}`).expect(204);
    await http.get(`/groups/${g.id}`).expect(404);
  });

  describe('pagamentos', () => {
    let gid: string;
    let a: string;
    let b: string;
    let c: string;
    const pay = (fromId: string, toId: string, amountCents: unknown) =>
      http.post(`/groups/${gid}/payments`).send({ fromId, toId, amountCents });
    const balances = async () =>
      (await http.get(`/groups/${gid}/settlement`).expect(200)).body as {
        balances: { balanceCents: number; sentCents: number; receivedCents: number }[];
        transfers: { fromId: string; toId: string; amountCents: number; pixPayload: string | null }[];
      };

    beforeEach(async () => {
      gid = (await http.post('/groups').send({ name: 'Pagamentos' })).body.id;
      await http.post(`/groups/${gid}/members`).send({ name: 'Ana', pixKey: 'ana@pix.com' });
      await http.post(`/groups/${gid}/members`).send({ name: 'Bia' });
      const m = (await http.post(`/groups/${gid}/members`).send({ name: 'Cadu' })).body.members;
      [a, b, c] = m.map((x: { id: string }) => x.id);
      const all = [{ memberId: a }, { memberId: b }, { memberId: c }];
      await http.post(`/groups/${gid}/expenses`).send({ description: 'Carne', amountCents: 9000, payerId: a, participants: all });
      await http.post(`/groups/${gid}/expenses`).send({ description: 'Cerveja', amountCents: 3000, payerId: b, participants: all });
    });

    it('parcial, total, ordem e acerto', async () => {
      const r = await pay(c, a, 1500).expect(201);
      expect((r.body as Detail).payments[0]).toMatchObject({ fromId: c, toId: a, amountCents: 1500 });
      const s = await balances();
      expect(s.balances.map((x) => x.balanceCents)).toEqual([3500, -1000, -2500]);
      expect(s.balances[2].sentCents).toBe(1500);
      expect(s.balances[0].receivedCents).toBe(1500);
      expect(s.transfers).toMatchObject([
        { fromId: c, toId: a, amountCents: 2500 },
        { fromId: b, toId: a, amountCents: 1000 },
      ]);
      expect(s.transfers[0].pixPayload).toContain('540525.00');

      await pay(c, a, 2500).expect(201);
      const last = await pay(b, a, 1000).expect(201);
      expect((last.body as Detail).payments.map((p) => p.amountCents)).toEqual([1000, 2500, 1500]);
      expect((await balances()).transfers).toEqual([]);
    });

    it('400/409 de validação', async () => {
      const r = await pay(c, a, 4001).expect(409);
      expect(r.body.message).toBe('Valor acima do devido: o máximo para este pagamento é R$ 40,00');
      await pay(c, c, 100).expect(400);
      await pay(b, c, 100).expect(400);
      await pay(c, a, 0).expect(400);
      await pay(c, a, 10.5).expect(400);
      await pay('x', a, 100).expect(400);
      await pay(randomUUID(), a, 100).expect(400);
      await http.post(`/groups/${gid}/payments`).send({ fromId: c, toId: a, amountCents: 100, extra: 1 }).expect(400);
      await http.post(`/groups/${randomUUID()}/payments`).send({ fromId: c, toId: a, amountCents: 100 }).expect(404);
    });

    it('desfazer restaura a transferência; pid inexistente → 404', async () => {
      const paid = (await pay(c, a, 4000).expect(201)).body as Detail;
      expect((await balances()).transfers).toHaveLength(1);
      const pid = paid.payments[0].id;
      const undone = await http.delete(`/groups/${gid}/payments/${pid}`).expect(200);
      expect((undone.body as Detail).payments).toEqual([]);
      expect((await balances()).transfers).toHaveLength(2);
      await http.delete(`/groups/${gid}/payments/${pid}`).expect(404);
    });

    it('remover pessoa com pagamento → 409; após desfazer → 200', async () => {
      const g0 = (await http.get(`/groups/${gid}`).expect(200)).body as Detail;
      for (const e of g0.expenses) await http.delete(`/groups/${gid}/expenses/${e.id}`).expect(200);
      const all = [{ memberId: a }, { memberId: b }];
      await http.post(`/groups/${gid}/expenses`).send({ description: 'Uber', amountCents: 2000, payerId: a, participants: all }).expect(201);
      const paid = (await pay(b, a, 1000).expect(201)).body as Detail;
      await http.delete(`/groups/${gid}/expenses/${paid.expenses[0].id}`).expect(200);
      const conflict = await http.delete(`/groups/${gid}/members/${b}`).expect(409);
      expect(conflict.body.message).toBe('Não é possível remover uma pessoa com pagamento registrado');
      await http.delete(`/groups/${gid}/payments/${paid.payments[0].id}`).expect(200);
      await http.delete(`/groups/${gid}/members/${b}`).expect(200);
    });

    it('remover despesa com pagamentos inverte saldos (permitido)', async () => {
      await pay(c, a, 4000).expect(201);
      const g0 = (await http.get(`/groups/${gid}`).expect(200)).body as Detail;
      const carne = g0.expenses.find((e) => e.description === 'Carne')!;
      await http.delete(`/groups/${gid}/expenses/${carne.id}`).expect(200);
      const s = await balances();
      expect(s.balances.reduce((acc, x) => acc + x.balanceCents, 0)).toBe(0);
      expect(s.balances[2].balanceCents).toBeGreaterThan(0);
      expect(s.transfers.some((t) => t.toId === c)).toBe(true);
    });

    it('excluir rolê com despesas e pagamentos → 204', async () => {
      await pay(c, a, 1000).expect(201);
      await http.delete(`/groups/${gid}`).expect(204);
      await http.get(`/groups/${gid}`).expect(404);
    });
  });

  describe('erros', () => {
    let gid: string;
    let aid: string;

    beforeAll(async () => {
      gid = (await http.post('/groups').send({ name: 'Erros' })).body.id;
      aid = (await http.post(`/groups/${gid}/members`).send({ name: 'Ana' })).body.members[0].id;
    });

    it('400: nome vazio, campo extra, nome longo', async () => {
      const r = await http.post('/groups').send({ name: '   ' }).expect(400);
      expect(r.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      await http.post('/groups').send({ name: 'x', hack: true }).expect(400);
      await http.post('/groups').send({ name: 'x'.repeat(61) }).expect(400);
      await http.post('/groups').send({}).expect(400);
    });

    it('400: despesa inválida', async () => {
      const base = { description: 'Pizza', amountCents: 1000, payerId: aid, participants: [{ memberId: aid }] };
      await http.post(`/groups/${gid}/expenses`).send({ ...base, amountCents: 0 }).expect(400);
      await http.post(`/groups/${gid}/expenses`).send({ ...base, amountCents: 10.5 }).expect(400);
      await http.post(`/groups/${gid}/expenses`).send({ ...base, amountCents: 100_000_001 }).expect(400);
      await http.post(`/groups/${gid}/expenses`).send({ ...base, participants: [] }).expect(400);
      await http.post(`/groups/${gid}/expenses`).send({ ...base, payerId: 'nao-existe' }).expect(400);
      await http.post(`/groups/${gid}/expenses`).send({ ...base, participants: [{ memberId: 'nope' }] }).expect(400);
      await http.post(`/groups/${gid}/expenses`).send({ ...base, participants: [{ memberId: aid }, { memberId: aid }] }).expect(400);
      await http.post(`/groups/${gid}/expenses`).send({ ...base, participants: [{ memberId: aid, weight: 0 }] }).expect(400);
      await http.post(`/groups/${gid}/expenses`).send({ ...base, participants: [{ memberId: aid, extra: 1 }] }).expect(400);
    });

    it('400: ids que não são UUID v4', async () => {
      const r = await http.get('/groups/nao-existe').expect(400);
      expect(r.body).toEqual({ statusCode: 400, message: 'Identificador inválido', error: 'Bad Request' });
      await http.delete(`/groups/${gid}/members/nope`).expect(400);
      await http.delete(`/groups/${gid}/expenses/nope`).expect(400);
      await http.delete(`/groups/${gid}/payments/nope`).expect(400);
    });

    it('404: rolê, pessoa, despesa e pagamento inexistentes', async () => {
      const r = await http.get(`/groups/${randomUUID()}`).expect(404);
      expect(r.body).toEqual({ statusCode: 404, message: 'Rolê não encontrado', error: 'Not Found' });
      await http.delete(`/groups/${randomUUID()}`).expect(404);
      await http.get(`/groups/${randomUUID()}/settlement`).expect(404);
      await http.post(`/groups/${randomUUID()}/members`).send({ name: 'X' }).expect(404);
      await http.delete(`/groups/${gid}/members/${randomUUID()}`).expect(404);
      await http.delete(`/groups/${gid}/expenses/${randomUUID()}`).expect(404);
      await http.delete(`/groups/${gid}/payments/${randomUUID()}`).expect(404);
    });

    it('409: pessoa com nome duplicado (case-insensitive)', async () => {
      const r = await http.post(`/groups/${gid}/members`).send({ name: ' ANA ' }).expect(409);
      expect(r.body.statusCode).toBe(409);
    });
  });
});
