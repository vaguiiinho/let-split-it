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

interface PersonBody {
  id: string;
  name: string;
  pixKey: string | null;
  createdAt: string;
  groupCount?: number;
  groups?: { id: string; name: string; memberCount: number; totalCents: number }[];
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
    await prisma.person.deleteMany();
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
  describe('pessoas e rolês', () => {
    const mkGroup = async (name: string) => (await http.post('/groups').send({ name }).expect(201)).body as Detail;

    it('CRUD de /people: 201, lista ordenada, detalhe, patch, delete, erros', async () => {
      const zed = (await http.post('/people').send({ name: ' Zed Pessoa ', pixKey: 'zed@pix.com' }).expect(201)).body as PersonBody;
      expect(zed).toMatchObject({ name: 'Zed Pessoa', pixKey: 'zed@pix.com' });
      expect(typeof zed.createdAt).toBe('string');
      const dup = await http.post('/people').send({ name: 'ZED pessoa' }).expect(409);
      expect(dup.body.message).toBe('Já existe uma pessoa chamada "ZED pessoa"');
      const abe = (await http.post('/people').send({ name: 'Abe Pessoa' }).expect(201)).body as PersonBody;
      expect(abe.pixKey).toBeNull();
      await http.post('/people').send({ name: 'Q', extra: 1 }).expect(400);
      await http.post('/people').send({}).expect(400);

      const list = (await http.get('/people').expect(200)).body as PersonBody[];
      const names = list.map((p) => p.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')));
      expect(list.find((p) => p.id === zed.id)?.groupCount).toBe(0);

      // detalhe com rolês
      const g1 = await mkGroup('Rolê P1');
      const g2 = await mkGroup('Rolê P2');
      await http.post(`/groups/${g1.id}/members`).send({ personId: zed.id }).expect(201);
      await http.post(`/groups/${g2.id}/members`).send({ personId: zed.id }).expect(201);
      const detail = (await http.get(`/people/${zed.id}`).expect(200)).body as PersonBody;
      expect(detail.groups?.map((g) => g.name)).toEqual(['Rolê P2', 'Rolê P1']);
      expect(detail.groups?.[0]).toMatchObject({ memberCount: 1, totalCents: 0 });
      expect(((await http.get('/people').expect(200)).body as PersonBody[]).find((p) => p.id === zed.id)?.groupCount).toBe(2);

      // patch
      await http.patch(`/people/${zed.id}`).send({}).expect(400);
      await http.patch(`/people/${zed.id}`).send({ name: 'abe pessoa' }).expect(409);
      await http.patch(`/people/${zed.id}`).send({ extra: 1 }).expect(400);
      const patched = await http.patch(`/people/${zed.id}`).send({ name: 'ZED PESSOA', pixKey: null }).expect(200);
      expect(patched.body).toMatchObject({ name: 'ZED PESSOA', pixKey: null });

      // delete
      const blocked = await http.delete(`/people/${zed.id}`).expect(409);
      expect(blocked.body.message).toBe('Não é possível excluir uma pessoa que participa de algum rolê');
      await http.delete(`/people/${abe.id}`).expect(204);
      await http.get(`/people/${abe.id}`).expect(404);
      await http.delete(`/people/${abe.id}`).expect(404);
      await http.get('/people/nope').expect(400);

      // excluir rolê mantém a pessoa
      await http.delete(`/groups/${g1.id}`).expect(204);
      const after = (await http.get(`/people/${zed.id}`).expect(200)).body as PersonBody;
      expect(after.groups).toHaveLength(1);
      await http.delete(`/groups/${g2.id}`).expect(204);
      expect(((await http.get(`/people/${zed.id}`).expect(200)).body as PersonBody).groups).toEqual([]);
      await http.delete(`/people/${zed.id}`).expect(204);
    });

    it('mesma pessoa em 2 rolês: mesmo id, saldos independentes; editar reflete em tudo', async () => {
      const g1 = await mkGroup('Rolê S1');
      const g2 = await mkGroup('Rolê S2');
      const a1 = ((await http.post(`/groups/${g1.id}/members`).send({ name: 'Lia', pixKey: 'lia@pix.com' }).expect(201)).body as Detail).members[0];
      const b1 = ((await http.post(`/groups/${g1.id}/members`).send({ name: 'Beto' }).expect(201)).body as Detail).members[1];
      const a2 = ((await http.post(`/groups/${g2.id}/members`).send({ name: ' lia ' }).expect(201)).body as Detail).members[0];
      expect(a2.id).toBe(a1.id);
      const c2 = ((await http.post(`/groups/${g2.id}/members`).send({ personId: b1.id }).expect(201)).body as Detail).members[1];
      expect(c2.id).toBe(b1.id);

      const conflict = await http.post(`/groups/${g1.id}/members`).send({ personId: a1.id }).expect(409);
      expect(conflict.body.message).toBe('Lia já está neste rolê');
      const pixConflict = await http.post(`/groups/${g2.id}/members`).send({ name: 'Lia', pixKey: 'outra@pix.com' }).expect(409);
      expect(pixConflict.body.message).toContain('com outra chave PIX');

      await http.post(`/groups/${g1.id}/expenses`).send({ description: 'Jantar', amountCents: 1000, payerId: a1.id, participants: [{ memberId: a1.id }, { memberId: b1.id }] }).expect(201);
      const s1 = (await http.get(`/groups/${g1.id}/settlement`).expect(200)).body;
      const s2 = (await http.get(`/groups/${g2.id}/settlement`).expect(200)).body;
      expect(s1.balances[0].balanceCents).toBe(500);
      expect(s2.balances[0].balanceCents).toBe(0);

      await http.patch(`/people/${a1.id}`).send({ name: 'Lia Souza' }).expect(200);
      expect(((await http.get(`/groups/${g2.id}`).expect(200)).body as Detail).members[0].name).toBe('Lia Souza');
      const s1b = (await http.get(`/groups/${g1.id}/settlement`).expect(200)).body;
      expect(s1b.balances[0].name).toBe('Lia Souza');
      expect(s1b.transfers[0]).toMatchObject({ toName: 'Lia Souza' });
      expect(s1b.transfers[0].pixPayload).toContain('br.gov.bcb.pix');

      // remover o membro preserva a pessoa
      await http.delete(`/groups/${g2.id}/members/${b1.id}`).expect(200);
      await http.get(`/people/${b1.id}`).expect(200);

      // formatos inválidos de POST members
      const msg = 'Informe uma pessoa existente ou o nome de uma nova pessoa';
      expect((await http.post(`/groups/${g2.id}/members`).send({}).expect(400)).body.message).toBe(msg);
      expect((await http.post(`/groups/${g2.id}/members`).send({ personId: a1.id, name: 'X' }).expect(400)).body.message).toBe(msg);
      expect((await http.post(`/groups/${g2.id}/members`).send({ personId: b1.id, pixKey: 'a@b.c' }).expect(400)).body.message).toBe('Chave PIX só pode ser informada ao criar uma nova pessoa');
      await http.post(`/groups/${g2.id}/members`).send({ personId: randomUUID() }).expect(404);
      await http.post(`/groups/${g2.id}/members`).send({ personId: 'x' }).expect(400);
    });

    it('PATCH /groups/:id', async () => {
      const g = await mkGroup('Antigo');
      await http.patch(`/groups/${g.id}`).send({ name: '' }).expect(400);
      await http.patch(`/groups/${g.id}`).send({ name: 'x', extra: 1 }).expect(400);
      const ok = await http.patch(`/groups/${g.id}`).send({ name: ' Praia ' }).expect(200);
      expect(ok.body.name).toBe('Praia');
      expect(((await http.get(`/groups/${g.id}`).expect(200)).body as Detail).name).toBe('Praia');
      await http.patch(`/groups/${randomUUID()}`).send({ name: 'A' }).expect(404);
      await http.patch('/groups/nope').send({ name: 'A' }).expect(400);
    });

    it('rolê inexistente com {name} não cria pessoa', async () => {
      await http.post(`/groups/${randomUUID()}/members`).send({ name: 'Fantasma' }).expect(404);
      const list = (await http.get('/people').expect(200)).body as PersonBody[];
      expect(list.some((p) => p.name === 'Fantasma')).toBe(false);
    });
  });

  describe('dashboard', () => {
    interface Dash {
      totals: Record<string, number>;
      groupsByStatus: Record<string, number>;
      byGroup: { groupId: string; name: string; totalCents: number }[];
      topPayers: { personId: string; name: string; paidCents: number }[];
      byMonth: { month: string; totalCents: number }[];
    }

    it('banco vazio e com dados', async () => {
      const prisma = app.get(PrismaService);
      await prisma.group.deleteMany();
      await prisma.person.deleteMany();
      const empty = (await http.get('/dashboard').expect(200)).body as Dash;
      expect(empty.totals).toEqual({ spentCents: 0, settledCents: 0, pendingCents: 0, groupCount: 0, peopleCount: 0, expenseCount: 0 });
      expect(empty.groupsByStatus).toEqual({ settled: 0, pending: 0, empty: 0 });
      expect(empty.byGroup).toEqual([]);
      expect(empty.topPayers).toEqual([]);
      expect(empty.byMonth).toHaveLength(6);
      expect(empty.byMonth.every((m) => /^\d{4}-\d{2}$/.test(m.month) && m.totalCents === 0)).toBe(true);

      const g = (await http.post('/groups').send({ name: 'Dash' }).expect(201)).body as Detail;
      await http.post('/groups').send({ name: 'Vazio' }).expect(201);
      await http.post(`/groups/${g.id}/members`).send({ name: 'Ana' }).expect(201);
      const withB = (await http.post(`/groups/${g.id}/members`).send({ name: 'Bia' }).expect(201)).body as Detail;
      const [a, b] = withB.members;
      await http.post(`/groups/${g.id}/expenses`).send({ description: 'Carne', amountCents: 9000, payerId: a.id, participants: [{ memberId: a.id }, { memberId: b.id }] }).expect(201);
      await http.post(`/groups/${g.id}/payments`).send({ fromId: b.id, toId: a.id, amountCents: 1000 }).expect(201);

      const d = (await http.get('/dashboard').expect(200)).body as Dash;
      expect(d.totals).toEqual({ spentCents: 9000, settledCents: 1000, pendingCents: 3500, groupCount: 2, peopleCount: 2, expenseCount: 1 });
      expect(d.groupsByStatus).toEqual({ settled: 0, pending: 1, empty: 1 });
      expect(d.byGroup).toEqual([{ groupId: g.id, name: 'Dash', totalCents: 9000 }]);
      expect(d.topPayers).toEqual([{ personId: a.id, name: 'Ana', paidCents: 9000 }]);
      expect(d.byMonth).toHaveLength(6);
      expect(d.byMonth.at(-1)?.totalCents).toBe(9000);
    });
  });
});
