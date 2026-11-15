import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/shared/infrastructure/prisma.service';
import { asUser, createUser, login } from './auth-helper';

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
  hasAccount?: boolean;
  groupCount?: number;
  groups?: { id: string; name: string; memberCount: number; totalCents: number }[];
}

describe('Racha Aí API (e2e)', () => {
  let app: INestApplication;
  let raw: ReturnType<typeof request>;
  let http: ReturnType<typeof asUser>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.groupInvite.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
    await prisma.person.deleteMany();
    raw = request(app.getHttpServer());
    // Os testes de negócio rodam como o USER "dono" (primeiro membro dos rolês que cria).
    await createUser(prisma, { username: 'dono', name: 'Dono' });
    http = asUser(raw, await login(raw, 'dono'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('fluxo completo: rolê → pessoas → despesas → acerto com PIX', async () => {
    const created = await http.post('/groups').send({ name: '  Churras  ' }).expect(201);
    const g = created.body as Detail;
    expect(g).toMatchObject({ name: 'Churras', totalCents: 0, expenses: [] });
    expect(g.members.map((m) => m.name)).toEqual(['Dono']); // R5: o criador é o primeiro membro

    await http.post(`/groups/${g.id}/members`).send({ name: 'Ana', pixKey: 'ana@pix.com' }).expect(201);
    await http.post(`/groups/${g.id}/members`).send({ name: 'Bia' }).expect(201);
    const withC = await http.post(`/groups/${g.id}/members`).send({ name: 'Cadu', pixKey: '' }).expect(201);
    const [, a, b, c] = (withC.body as Detail).members;
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
    expect(s.body.balances.map((x: { balanceCents: number }) => x.balanceCents)).toEqual([0, 5000, -1000, -4000]);
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
    expect(list.body[0]).toMatchObject({ id: g.id, name: 'Churras', memberCount: 4, expenseCount: 3, totalCents: 12100 });

    // remover pessoa envolvida → 409; remover despesa e depois pessoa → 200
    const conflict = await http.delete(`/groups/${g.id}/members/${c.id}`).expect(409);
    expect(conflict.body).toMatchObject({ statusCode: 409, error: 'Conflict' });
    expect(typeof conflict.body.message).toBe('string');

    const cur = (await http.get(`/groups/${g.id}`).expect(200)).body as Detail;
    for (const e of cur.expenses) {
      await http.delete(`/groups/${g.id}/expenses/${e.id}`).expect(200);
    }
    const afterRemove = await http.delete(`/groups/${g.id}/members/${c.id}`).expect(200);
    expect((afterRemove.body as Detail).members).toHaveLength(3);

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
      [, a, b, c] = m.map((x: { id: string }) => x.id);
      const all = [{ memberId: a }, { memberId: b }, { memberId: c }];
      await http.post(`/groups/${gid}/expenses`).send({ description: 'Carne', amountCents: 9000, payerId: a, participants: all });
      await http.post(`/groups/${gid}/expenses`).send({ description: 'Cerveja', amountCents: 3000, payerId: b, participants: all });
    });

    it('parcial, total, ordem e acerto', async () => {
      const r = await pay(c, a, 1500).expect(201);
      expect((r.body as Detail).payments[0]).toMatchObject({ fromId: c, toId: a, amountCents: 1500 });
      const s = await balances();
      expect(s.balances.map((x) => x.balanceCents)).toEqual([0, 3500, -1000, -2500]);
      expect(s.balances[3].sentCents).toBe(1500);
      expect(s.balances[1].receivedCents).toBe(1500);
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
      expect(detail.groups?.[0]).toMatchObject({ memberCount: 2, totalCents: 0 });
      expect(((await http.get('/people').expect(200)).body as PersonBody[]).find((p) => p.id === zed.id)?.groupCount).toBe(2);

      // patch
      await http.patch(`/people/${zed.id}`).send({}).expect(400);
      await http.patch(`/people/${zed.id}`).send({ name: 'abe pessoa' }).expect(409);
      await http.patch(`/people/${zed.id}`).send({ extra: 1 }).expect(400);
      const patched = await http.patch(`/people/${zed.id}`).send({ name: 'ZED PESSOA', pixKey: null }).expect(200);
      expect(patched.body).toMatchObject({ name: 'ZED PESSOA', pixKey: null });
      await http.patch(`/people/${zed.id}`).send({ pixKey: 123 }).expect(400);

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
      const a1 = ((await http.post(`/groups/${g1.id}/members`).send({ name: 'Lia', pixKey: 'lia@pix.com' }).expect(201)).body as Detail).members[1];
      const b1 = ((await http.post(`/groups/${g1.id}/members`).send({ name: 'Beto' }).expect(201)).body as Detail).members[2];
      const a2 = ((await http.post(`/groups/${g2.id}/members`).send({ name: ' lia ' }).expect(201)).body as Detail).members[1];
      expect(a2.id).toBe(a1.id);
      const c2 = ((await http.post(`/groups/${g2.id}/members`).send({ personId: b1.id }).expect(201)).body as Detail).members[2];
      expect(c2.id).toBe(b1.id);

      const conflict = await http.post(`/groups/${g1.id}/members`).send({ personId: a1.id }).expect(409);
      expect(conflict.body.message).toBe('Lia já está neste rolê');
      const pixConflict = await http.post(`/groups/${g2.id}/members`).send({ name: 'Lia', pixKey: 'outra@pix.com' }).expect(409);
      expect(pixConflict.body.message).toContain('com outra chave PIX');

      await http.post(`/groups/${g1.id}/expenses`).send({ description: 'Jantar', amountCents: 1000, payerId: a1.id, participants: [{ memberId: a1.id }, { memberId: b1.id }] }).expect(201);
      const s1 = (await http.get(`/groups/${g1.id}/settlement`).expect(200)).body;
      const s2 = (await http.get(`/groups/${g2.id}/settlement`).expect(200)).body;
      const bal = (s: { balances: { memberId: string; balanceCents: number; name: string }[] }, id: string) =>
        s.balances.find((x) => x.memberId === id)!;
      expect(bal(s1, a1.id).balanceCents).toBe(500);
      expect(bal(s2, a1.id).balanceCents).toBe(0);

      await http.patch(`/people/${a1.id}`).send({ name: 'Lia Souza' }).expect(200);
      expect(((await http.get(`/groups/${g2.id}`).expect(200)).body as Detail).members[1].name).toBe('Lia Souza');
      const s1b = (await http.get(`/groups/${g1.id}/settlement`).expect(200)).body;
      expect(bal(s1b, a1.id).name).toBe('Lia Souza');
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
      await prisma.group.deleteMany();
      await prisma.person.deleteMany({ where: { user: null } });
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
      const [, a, b] = withB.members;
      await http.post(`/groups/${g.id}/expenses`).send({ description: 'Carne', amountCents: 9000, payerId: a.id, participants: [{ memberId: a.id }, { memberId: b.id }] }).expect(201);
      await http.post(`/groups/${g.id}/payments`).send({ fromId: b.id, toId: a.id, amountCents: 1000 }).expect(201);

      const d = (await http.get('/dashboard').expect(200)).body as Dash;
      expect(d.totals).toEqual({ spentCents: 9000, settledCents: 1000, pendingCents: 3500, groupCount: 2, peopleCount: 3, expenseCount: 1 });
      expect(d.groupsByStatus).toEqual({ settled: 0, pending: 1, empty: 1 });
      expect(d.byGroup).toEqual([{ groupId: g.id, name: 'Dash', totalCents: 9000 }]);
      expect(d.topPayers).toEqual([{ personId: a.id, name: 'Ana', paidCents: 9000 }]);
      expect(d.byMonth).toHaveLength(6);
      expect(d.byMonth.at(-1)?.totalCents).toBe(9000);
    });
  });

  describe('autenticação e autorização', () => {
    const mk = async (username: string, role: 'USER' | 'ADMIN' = 'USER', isDemo = false) => {
      const ids = await createUser(prisma, { username, role, isDemo });
      return { ...ids, http: asUser(raw, await login(raw, username)) };
    };

    it('401 sem token, com token lixo e login errado; /health é público; login ok; /auth/me', async () => {
      const noToken = await raw.get('/groups').expect(401);
      expect(noToken.body).toEqual({ statusCode: 401, message: 'Não autenticado', error: 'Unauthorized' });
      await raw.get('/groups').set('Authorization', 'Basic abc').expect(401);
      const junk = await raw.get('/groups').set('Authorization', 'Bearer lixo').expect(401);
      expect(junk.body.message).toBe('Sessão expirada ou inválida');
      await raw.get('/health').expect(200);
      const bad = await raw.post('/auth/login').send({ username: 'dono', password: 'errada123' }).expect(401);
      expect(bad.body.message).toBe('Usuário ou senha inválidos');
      await raw.post('/auth/login').send({ username: '@@', password: 'x' }).expect(401);
      await raw.post('/auth/login').send({ username: 'nao-existe', password: 'x' }).expect(401);
      await raw.post('/auth/login').send({ username: 'dono' }).expect(400);
      const ok = await raw.post('/auth/login').send({ username: ' DONO ', password: 'senha1234' }).expect(200);
      expect(ok.body.user).toMatchObject({ username: 'dono', name: 'Dono', role: 'USER' });
      expect(ok.body.user).not.toHaveProperty('passwordHash');
      const me = await http.get('/auth/me').expect(200);
      expect(me.body).toMatchObject({ username: 'dono', pendingInviteCount: 0 });
    });

    it('token de usuário removido → 401', async () => {
      const ghost = await mk('fantasma');
      await prisma.user.delete({ where: { id: ghost.userId } });
      const r = await ghost.http.get('/groups').expect(401);
      expect(r.body.message).toBe('Sessão expirada ou inválida');
    });

    it('/users: USER → 403; ADMIN cria (201), duplicado → 409, lista e busca', async () => {
      const user = await mk('comum');
      const admin = await mk('chefe', 'ADMIN');
      expect((await user.http.get('/users').expect(403)).body).toEqual({
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      });
      await user.http.post('/users').send({ username: 'novo', password: 'senha1234' }).expect(403);
      const created = await admin.http
        .post('/users')
        .send({ username: 'Novo.User', password: 'senha1234', name: 'Novo Usuário' })
        .expect(201);
      expect(created.body).toMatchObject({ username: 'novo.user', name: 'Novo Usuário', role: 'USER', isDemo: false });
      expect(created.body).not.toHaveProperty('password');
      const dup = await admin.http.post('/users').send({ username: 'NOVO.user', password: 'senha1234' }).expect(409);
      expect(dup.body.message).toBe('Já existe um usuário "novo.user"');
      await admin.http.post('/users').send({ username: 'x', password: 'senha1234' }).expect(400);
      await admin.http.post('/users').send({ username: 'abc', password: 'senha1234', role: 'ROOT' }).expect(400);
      const nameConflict = await admin.http
        .post('/users')
        .send({ username: 'outro.user', password: 'senha1234', name: 'novo usuário' })
        .expect(409);
      expect(nameConflict.body.message).toBe('A pessoa "Novo Usuário" já está vinculada a outro usuário');
      const list = await admin.http.get('/users').expect(200);
      const names = (list.body as { username: string }[]).map((u) => u.username);
      expect(names).toEqual([...names].sort());
      await raw.post('/auth/login').send({ username: 'novo.user', password: 'senha1234' }).expect(200);

      const found = await user.http.get('/users/search?q=novo').expect(200);
      expect(found.body).toEqual([{ id: created.body.id, username: 'novo.user', name: 'Novo Usuário' }]);
      expect((await user.http.get('/users/search?q=a').expect(400)).body.message).toBe(
        'Informe de 2 a 30 caracteres para buscar',
      );
      await user.http.get('/users/search').expect(400);
      expect(((await user.http.get('/users/search?q=comum').expect(200)).body as unknown[]).length).toBe(0);
    });

    it('rolês de A não aparecem para B; sub-rotas → 404; ADMIN vê todos', async () => {
      const a = await mk('priv.a');
      const b = await mk('priv.b');
      const admin = await mk('priv.admin', 'ADMIN');
      const ga = (await a.http.post('/groups').send({ name: 'Segredo A' }).expect(201)).body as Detail;
      expect(ga.members.map((m) => m.id)).toEqual([a.personId]);
      expect(((await b.http.get('/groups').expect(200)).body as { id: string }[]).some((g) => g.id === ga.id)).toBe(false);
      expect(((await a.http.get('/groups').expect(200)).body as { id: string }[]).some((g) => g.id === ga.id)).toBe(true);
      for (const url of [`/groups/${ga.id}`, `/groups/${ga.id}/settlement`, `/groups/${ga.id}/invites`]) {
        const r = await b.http.get(url).expect(404);
        expect(r.body.message).toBe('Rolê não encontrado');
      }
      await b.http.post(`/groups/${ga.id}/expenses`).send({ description: 'x', amountCents: 1, payerId: b.personId, participants: [{ memberId: b.personId }] }).expect(404);
      await b.http.patch(`/groups/${ga.id}`).send({ name: 'x' }).expect(404);
      await b.http.delete(`/groups/${ga.id}`).expect(404);
      await b.http.post(`/groups/${ga.id}/invites`).send({ username: 'priv.a' }).expect(404);
      await admin.http.get(`/groups/${ga.id}`).expect(200);
      expect(((await admin.http.get('/groups').expect(200)).body as { id: string }[]).some((g) => g.id === ga.id)).toBe(true);
      // P9: a lista de rolês de uma pessoa não vaza rolês alheios
      const person = (await b.http.get(`/people/${a.personId}`).expect(200)).body as PersonBody;
      expect(person.groups).toEqual([]);
      expect(person.hasAccount).toBe(true);
      expect(((await admin.http.get(`/people/${a.personId}`).expect(200)).body as PersonBody).groups?.map((g) => g.id)).toEqual([ga.id]);
      // dashboard de B não conta rolês de A
      const dash = (await b.http.get('/dashboard').expect(200)).body as { totals: { groupCount: number } };
      expect(dash.totals.groupCount).toBe(0);
    });

    it('convites: fluxo completo, R7, R8, P7 e 403 para membro', async () => {
      const a = await mk('conv.a');
      const b = await mk('conv.b');
      const g = (await a.http.post('/groups').send({ name: 'Com convite' }).expect(201)).body as Detail;

      // R7: pessoa com conta não entra direto
      const r7 = await a.http.post(`/groups/${g.id}/members`).send({ personId: b.personId }).expect(409);
      expect(r7.body.message).toBe('conv.b tem conta no Racha Aí: envie um convite');
      await a.http.post(`/groups/${g.id}/members`).send({ name: 'CONV.B' }).expect(409);
      // P7
      const p7 = await a.http.delete(`/people/${a.personId}`).expect(409);
      expect(p7.body.message).toBe('Não é possível excluir uma pessoa vinculada a um usuário');

      await a.http.post(`/groups/${g.id}/invites`).send({}).expect(400);
      await a.http.post(`/groups/${g.id}/invites`).send({ username: 'conv.a' }).expect(400);
      await a.http.post(`/groups/${g.id}/invites`).send({ username: 'nao.existe' }).expect(404);
      const inv = (await a.http.post(`/groups/${g.id}/invites`).send({ username: 'conv.b' }).expect(201)).body;
      expect(inv).toMatchObject({ groupId: g.id, status: 'PENDING', invitee: { username: 'conv.b' } });
      const dupInv = await a.http.post(`/groups/${g.id}/invites`).send({ userId: b.userId }).expect(409);
      expect(dupInv.body.message).toBe('Já existe um convite pendente para conv.b neste rolê');
      expect(((await a.http.get(`/groups/${g.id}/invites`).expect(200)).body as unknown[]).length).toBe(1);

      const mine = (await b.http.get('/invites').expect(200)).body as { id: string; group: { name: string }; inviter: { username: string } }[];
      expect(mine).toHaveLength(1);
      expect(mine[0]).toMatchObject({ id: inv.id, group: { name: 'Com convite' }, inviter: { username: 'conv.a' } });
      expect((await b.http.get('/auth/me').expect(200)).body.pendingInviteCount).toBe(1);
      await b.http.get(`/groups/${g.id}`).expect(404);

      // C5: o dono do rolê (outro usuário) não responde o convite de B
      await a.http.post(`/invites/${inv.id}/accept`).expect(404);
      const acc = await b.http.post(`/invites/${inv.id}/accept`).expect(200);
      expect(acc.body).toEqual({ groupId: g.id });
      const seen = (await b.http.get(`/groups/${g.id}`).expect(200)).body as Detail;
      expect(seen.members.map((m) => m.id)).toContain(b.personId);
      expect(((await b.http.get('/groups').expect(200)).body as { id: string }[]).map((x) => x.id)).toContain(g.id);
      expect((await b.http.get('/auth/me').expect(200)).body.pendingInviteCount).toBe(0);

      await b.http.post(`/invites/${inv.id}/decline`).expect(409);
      await b.http.post(`/invites/${inv.id}/accept`).expect(409);
      const again = await a.http.post(`/groups/${g.id}/invites`).send({ username: 'conv.b' }).expect(409);
      expect(again.body.message).toBe('conv.b já participa deste rolê');
      await b.http.post(`/invites/${randomUUID()}/accept`).expect(404);

      // membro (não dono): vê, mas não gerencia
      await b.http.patch(`/groups/${g.id}`).send({ name: 'Meu agora' }).expect(403);
      expect((await b.http.delete(`/groups/${g.id}`).expect(403)).body.message).toBe('Acesso negado');
      // R8
      const r8 = await b.http.delete(`/groups/${g.id}/members/${a.personId}`).expect(409);
      expect(r8.body.message).toBe('O dono do rolê não pode ser removido');
      await b.http.delete(`/groups/${g.id}/members/${b.personId}`).expect(200);
      await b.http.get(`/groups/${g.id}`).expect(404);
    });

    it('recusar convite (204) e convidar de novo (C3)', async () => {
      const a = await mk('rec.a');
      const b = await mk('rec.b');
      const g = (await a.http.post('/groups').send({ name: 'Recusa' }).expect(201)).body as Detail;
      const inv = (await a.http.post(`/groups/${g.id}/invites`).send({ username: 'rec.b' }).expect(201)).body;
      await b.http.post(`/invites/${inv.id}/decline`).expect(204);
      expect(((await b.http.get('/invites').expect(200)).body as unknown[]).length).toBe(0);
      await a.http.post(`/groups/${g.id}/invites`).send({ username: 'rec.b' }).expect(201);
    });

    it('ADMIN adiciona pessoa com conta direto e gerencia rolê alheio', async () => {
      const a = await mk('adm.a');
      const admin = await mk('adm.admin', 'ADMIN');
      const g = (await a.http.post('/groups').send({ name: 'Do A' }).expect(201)).body as Detail;
      const out = await admin.http.post(`/groups/${g.id}/members`).send({ personId: admin.personId }).expect(201);
      expect((out.body as Detail).members.map((m) => m.id)).toContain(admin.personId);
      await admin.http.patch(`/groups/${g.id}`).send({ name: 'Renomeado' }).expect(200);
      await admin.http.delete(`/groups/${g.id}`).expect(204);
    });
  });

  describe('limpeza de dados de demonstração (Adendo A)', () => {
    it('apaga o que é de demo e preserva o resto; só ADMIN dispara', async () => {
      const hugo = await createUser(prisma, { username: 'demo.hugo', isDemo: true });
      const hugoHttp = asUser(raw, await login(raw, 'demo.hugo'));
      const luiz = await createUser(prisma, { username: 'demo.luiz', isDemo: true });
      const luizHttp = asUser(raw, await login(raw, 'demo.luiz'));
      const admin = await createUser(prisma, { username: 'demo.admin', role: 'ADMIN' });
      const adminHttp = asUser(raw, await login(raw, 'demo.admin'));
      const real = await createUser(prisma, { username: 'demo.real' });
      const realHttp = asUser(raw, await login(raw, 'demo.real'));

      // rolê de demo (com pessoa criada por ele e um convite) → apagado
      const demoGroup = (await hugoHttp.post('/groups').send({ name: 'Rolê demo' }).expect(201)).body as Detail;
      await hugoHttp.post(`/groups/${demoGroup.id}/members`).send({ name: 'Convidado Solto' }).expect(201);
      const shared = (await hugoHttp.post(`/groups/${demoGroup.id}/members`).send({ name: 'Convidado Usado' }).expect(201)).body as Detail;
      const usedId = shared.members.find((m) => m.name === 'Convidado Usado')!.id;
      await hugoHttp.post(`/groups/${demoGroup.id}/invites`).send({ username: 'demo.luiz' }).expect(201);
      // pessoa criada por demo e usada em rolê do admin → preservada
      const adminGroup = (await adminHttp.post('/groups').send({ name: 'Rolê do admin' }).expect(201)).body as Detail;
      await adminHttp.post(`/groups/${adminGroup.id}/members`).send({ personId: usedId }).expect(201);
      await adminHttp.post(`/groups/${adminGroup.id}/members`).send({ personId: hugo.personId }).expect(201);
      // convite de admin para demo (restante, convidado demo) → apagado
      await adminHttp.post(`/groups/${adminGroup.id}/invites`).send({ username: 'demo.luiz' }).expect(201);
      // rolê de usuário não demo com membro demo → preservado
      const realGroup = (await realHttp.post('/groups').send({ name: 'Rolê real' }).expect(201)).body as Detail;
      await realHttp.post(`/groups/${realGroup.id}/invites`).send({ username: 'demo.luiz' }).expect(201);

      await hugoHttp.post('/admin/demo/purge').expect(403);
      await raw.post('/admin/demo/purge').expect(401);
      const out = await adminHttp.post('/admin/demo/purge').expect(200);
      expect(out.body).toMatchObject({ groups: expect.any(Number), invites: expect.any(Number), people: expect.any(Number) });
      expect(out.body.groups).toBeGreaterThanOrEqual(1);
      expect(out.body.people).toBeGreaterThanOrEqual(1);

      await hugoHttp.get(`/groups/${demoGroup.id}`).expect(404);
      expect(await prisma.group.count({ where: { id: demoGroup.id } })).toBe(0);
      expect(await prisma.person.count({ where: { name: 'Convidado Solto' } })).toBe(0);
      expect(await prisma.person.count({ where: { name: 'Convidado Usado' } })).toBe(1);
      expect(await prisma.group.count({ where: { id: { in: [adminGroup.id, realGroup.id] } } })).toBe(2);
      expect(await prisma.groupInvite.count({ where: { inviteeId: luiz.userId } })).toBe(0);
      // usuários demo e suas Persons continuam, e o login funciona
      expect(await prisma.user.count({ where: { id: { in: [hugo.userId, luiz.userId, admin.userId, real.userId] } } })).toBe(4);
      expect(await prisma.person.count({ where: { id: { in: [hugo.personId, luiz.personId] } } })).toBe(2);
      await raw.post('/auth/login').send({ username: 'demo.luiz', password: 'senha1234' }).expect(200);
      expect(((await luizHttp.get('/groups').expect(200)).body as unknown[]).length).toBe(0);
      // idempotente
      const again = await adminHttp.post('/admin/demo/purge').expect(200);
      expect(again.body).toEqual({ groups: 0, invites: 0, people: 0 });
    });
  });
});
