import { PersonRepository } from '../../../people/domain/person.repository';
import { makeUser, makeUserRepo } from '../../../users/testing/fixtures';
import { FakeClock, makeRepo } from '../../testing/fixtures';
import { AddExpenseUseCase } from './add-expense.use-case';
import { AddMemberUseCase } from './add-member.use-case';
import { CreateGroupUseCase } from './create-group.use-case';
import { DeleteGroupUseCase } from './delete-group.use-case';
import { GetDashboardUseCase } from './get-dashboard.use-case';
import { GetGroupUseCase } from './get-group.use-case';
import { GetSettlementUseCase } from './get-settlement.use-case';
import { ListGroupsUseCase } from './list-groups.use-case';
import { RegisterPaymentUseCase } from './register-payment.use-case';
import { RemoveMemberUseCase } from './remove-member.use-case';
import { UpdateGroupUseCase } from './update-group.use-case';

async function setup() {
  const repos = makeUserRepo();
  const groups = makeRepo();
  const clock = new FakeClock();
  const people = repos.people as PersonRepository;
  const ana = await makeUser(repos, 'ana');
  const bia = await makeUser(repos, 'bia');
  const admin = await makeUser(repos, 'admin', { role: 'ADMIN' });
  const create = new CreateGroupUseCase(groups, people, clock);
  const addMember = new AddMemberUseCase(groups, people, repos.users, clock);
  const g = await create.execute({ actor: ana.actor, name: 'Do Ana' });
  return { repos, groups, clock, people, ana, bia, admin, create, addMember, gid: g.id };
}

describe('autorização nos use cases de rolê', () => {
  it('estranho recebe 404 nas rotas do rolê (R3)', async () => {
    const { groups, clock, bia, gid } = await setup();
    const input = { actor: bia.actor, groupId: gid };
    const nf = { kind: 'not_found', message: 'Rolê não encontrado' };
    await expect(new GetGroupUseCase(groups).execute(input)).rejects.toMatchObject(nf);
    await expect(new GetSettlementUseCase(groups).execute(input)).rejects.toMatchObject(nf);
    await expect(
      new AddExpenseUseCase(groups, clock).execute({
        ...input,
        description: 'x',
        amountCents: 100,
        payerId: bia.actor.personId,
        participants: [{ memberId: bia.actor.personId }],
      }),
    ).rejects.toMatchObject(nf);
    await expect(
      new RegisterPaymentUseCase(groups, clock).execute({
        ...input,
        fromId: bia.actor.personId,
        toId: bia.actor.personId,
        amountCents: 1,
      }),
    ).rejects.toMatchObject(nf);
    await expect(new UpdateGroupUseCase(groups).execute({ ...input, name: 'x' })).rejects.toMatchObject(nf);
    await expect(new DeleteGroupUseCase(groups).execute(input)).rejects.toMatchObject(nf);
  });

  it('membro não dono: vê, mas update/delete → 403; ADMIN e dono gerenciam', async () => {
    const { groups, ana, bia, admin, addMember, gid } = await setup();
    await addMember.execute({ actor: ana.actor, groupId: gid, personId: bia.actor.personId }).catch(() => undefined);
    // bia tem conta: R7 bloqueia o dono, mas o ADMIN adiciona direto
    await addMember.execute({ actor: admin.actor, groupId: gid, personId: bia.actor.personId });
    expect((await new GetGroupUseCase(groups).execute({ actor: bia.actor, groupId: gid })).ownerId).toBe(
      ana.actor.userId,
    );
    const forbidden = { kind: 'forbidden', message: 'Acesso negado' };
    await expect(
      new UpdateGroupUseCase(groups).execute({ actor: bia.actor, groupId: gid, name: 'x' }),
    ).rejects.toMatchObject(forbidden);
    await expect(new DeleteGroupUseCase(groups).execute({ actor: bia.actor, groupId: gid })).rejects.toMatchObject(
      forbidden,
    );
    expect((await new UpdateGroupUseCase(groups).execute({ actor: ana.actor, groupId: gid, name: 'Novo' })).name).toBe(
      'Novo',
    );
    await new DeleteGroupUseCase(groups).execute({ actor: admin.actor, groupId: gid });
    expect(await groups.findAll({ kind: 'all' })).toHaveLength(0);
  });

  it('create-group grava o ownerId e a Person do ator é members[0]', async () => {
    const { ana, create } = await setup();
    const out = await create.execute({ actor: ana.actor, name: 'Outro' });
    expect(out.ownerId).toBe(ana.actor.userId);
    expect(out.members[0].id).toBe(ana.actor.personId);
  });

  it('list-groups e dashboard de USER contam só os rolês visíveis; ADMIN vê todos', async () => {
    const { groups, clock, people, ana, bia, admin, create } = await setup();
    await create.execute({ actor: bia.actor, name: 'Da Bia' });
    const list = new ListGroupsUseCase(groups);
    expect((await list.execute({ actor: ana.actor })).map((g) => g.name)).toEqual(['Do Ana']);
    expect(await list.execute({ actor: admin.actor })).toHaveLength(2);
    const dash = new GetDashboardUseCase(groups, people, clock);
    const d = await dash.execute({ actor: ana.actor });
    expect(d.totals.groupCount).toBe(1);
    expect(d.totals.peopleCount).toBe(1);
    const da = await dash.execute({ actor: admin.actor });
    expect(da.totals.groupCount).toBe(2);
    expect(da.totals.peopleCount).toBe(3);
  });

  it('add-member com Person com conta → 409 R7 para USER (por id e por nome), ok para ADMIN', async () => {
    const { ana, bia, admin, addMember, gid } = await setup();
    const msg = { kind: 'conflict', message: 'bia tem conta no Racha Aí: envie um convite' };
    await expect(
      addMember.execute({ actor: ana.actor, groupId: gid, personId: bia.actor.personId }),
    ).rejects.toMatchObject(msg);
    await expect(addMember.execute({ actor: ana.actor, groupId: gid, name: 'BIA' })).rejects.toMatchObject(msg);
    const out = await addMember.execute({ actor: admin.actor, groupId: gid, personId: bia.actor.personId });
    expect(out.members.map((m) => m.id)).toContain(bia.actor.personId);
  });

  it('add-member nova pessoa grava createdById (DM2)', async () => {
    const { ana, addMember, gid, people } = await setup();
    await addMember.execute({ actor: ana.actor, groupId: gid, name: 'Visitante' });
    const p = await people.findByNameKey('visitante');
    expect(p?.createdById?.value).toBe(ana.actor.userId);
  });

  it('remove-member do dono → 409 R8; outros ok', async () => {
    const { groups, ana, addMember, gid } = await setup();
    const out = await addMember.execute({ actor: ana.actor, groupId: gid, name: 'Visitante' });
    const uc = new RemoveMemberUseCase(groups);
    await expect(
      uc.execute({ actor: ana.actor, groupId: gid, memberId: ana.actor.personId }),
    ).rejects.toMatchObject({ kind: 'conflict', message: 'O dono do rolê não pode ser removido' });
    const visitor = out.members.find((m) => m.name === 'Visitante')!;
    const after = await uc.execute({ actor: ana.actor, groupId: gid, memberId: visitor.id });
    expect(after.members).toHaveLength(1);
  });
});
