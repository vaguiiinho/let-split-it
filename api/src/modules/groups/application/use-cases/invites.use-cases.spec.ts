import { randomUUID } from 'node:crypto';
import { makeUser, makeUserRepo } from '../../../users/testing/fixtures';
import { FakeClock, InMemoryGroupInviteRepository, makeRepo } from '../../testing/fixtures';
import { AcceptInviteUseCase } from './accept-invite.use-case';
import { CreateGroupUseCase } from './create-group.use-case';
import { DeclineInviteUseCase } from './decline-invite.use-case';
import { GetGroupUseCase } from './get-group.use-case';
import { InviteUserUseCase } from './invite-user.use-case';
import { ListGroupInvitesUseCase } from './list-group-invites.use-case';
import { ListMyInvitesUseCase } from './list-my-invites.use-case';
import { AddMemberUseCase } from './add-member.use-case';

async function setup() {
  const repos = makeUserRepo();
  const groups = makeRepo();
  const invites = new InMemoryGroupInviteRepository(repos.users, groups);
  const clock = new FakeClock();
  const ana = await makeUser(repos, 'ana');
  const bia = await makeUser(repos, 'bia');
  const cadu = await makeUser(repos, 'cadu');
  const admin = await makeUser(repos, 'admin', { role: 'ADMIN' });
  const g = await new CreateGroupUseCase(groups, repos.people, clock).execute({ actor: ana.actor, name: 'Churras' });
  return {
    groups,
    invites,
    repos,
    ana,
    bia,
    cadu,
    admin,
    gid: g.id,
    invite: new InviteUserUseCase(groups, invites, repos.users, clock),
    accept: new AcceptInviteUseCase(groups, invites, repos.people, clock),
    decline: new DeclineInviteUseCase(invites, clock),
    mine: new ListMyInvitesUseCase(invites),
    listGroup: new ListGroupInvitesUseCase(groups, invites),
    getGroup: new GetGroupUseCase(groups),
    addMember: new AddMemberUseCase(groups, repos.people, repos.users, clock),
  };
}

describe('InviteUserUseCase (C1/C2)', () => {
  it('convida por username e por userId', async () => {
    const s = await setup();
    const out = await s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: ' BIA ' });
    expect(out).toMatchObject({ groupId: s.gid, status: 'PENDING', invitee: { username: 'bia', name: 'bia' } });
    const out2 = await s.invite.execute({ actor: s.ana.actor, groupId: s.gid, userId: s.cadu.actor.userId });
    expect(out2.invitee.username).toBe('cadu');
  });

  it('C1: exatamente um de userId/username', async () => {
    const s = await setup();
    const msg = { kind: 'validation', message: 'Informe o usuário a convidar' };
    await expect(s.invite.execute({ actor: s.ana.actor, groupId: s.gid })).rejects.toMatchObject(msg);
    await expect(
      s.invite.execute({ actor: s.ana.actor, groupId: s.gid, userId: s.bia.actor.userId, username: 'bia' }),
    ).rejects.toMatchObject(msg);
  });

  it('C2: ordem das checagens e mensagens', async () => {
    const s = await setup();
    await expect(s.invite.execute({ actor: s.ana.actor, groupId: 'x', username: 'bia' })).rejects.toMatchObject({
      message: 'Identificador inválido',
    });
    await expect(s.invite.execute({ actor: s.cadu.actor, groupId: s.gid, username: 'bia' })).rejects.toMatchObject({
      kind: 'not_found',
      message: 'Rolê não encontrado',
    });
    await expect(s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: 'fantasma' })).rejects.toMatchObject({
      kind: 'not_found',
      message: 'Usuário não encontrado',
    });
    await expect(s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: 'ana' })).rejects.toMatchObject({
      kind: 'validation',
      message: 'Você não pode convidar a si mesmo',
    });
    await s.addMember.execute({ actor: s.admin.actor, groupId: s.gid, personId: s.cadu.actor.personId });
    await expect(s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: 'cadu' })).rejects.toMatchObject({
      kind: 'conflict',
      message: 'cadu já participa deste rolê',
    });
    await s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: 'bia' });
    await expect(s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: 'bia' })).rejects.toMatchObject({
      kind: 'conflict',
      message: 'Já existe um convite pendente para bia neste rolê',
    });
  });

  it('C3: após recusa, novo convite é permitido', async () => {
    const s = await setup();
    const inv = await s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: 'bia' });
    await s.decline.execute({ actor: s.bia.actor, inviteId: inv.id });
    await expect(s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: 'bia' })).resolves.toBeDefined();
  });
});

describe('accept / decline / listas', () => {
  it('aceitar adiciona o membro, marca ACCEPTED com respondedAt e devolve groupId', async () => {
    const s = await setup();
    const inv = await s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: 'bia' });
    expect(await s.accept.execute({ actor: s.bia.actor, inviteId: inv.id })).toEqual({ groupId: s.gid });
    const detail = await s.getGroup.execute({ actor: s.bia.actor, groupId: s.gid });
    expect(detail.members.map((m) => m.id)).toContain(s.bia.actor.personId);
    expect(await s.mine.execute({ actor: s.bia.actor })).toEqual([]);
  });

  it('aceitar já sendo membro não duplica e marca ACCEPTED', async () => {
    const s = await setup();
    const inv = await s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: 'bia' });
    await s.addMember.execute({ actor: s.admin.actor, groupId: s.gid, personId: s.bia.actor.personId });
    await s.accept.execute({ actor: s.bia.actor, inviteId: inv.id });
    const detail = await s.getGroup.execute({ actor: s.bia.actor, groupId: s.gid });
    expect(detail.members.filter((m) => m.id === s.bia.actor.personId)).toHaveLength(1);
    await expect(s.accept.execute({ actor: s.bia.actor, inviteId: inv.id })).rejects.toMatchObject({
      kind: 'conflict',
      message: 'Este convite já foi respondido',
    });
  });

  it('convite de outro usuário (inclusive ADMIN) ou inexistente → 404; respondido → 409', async () => {
    const s = await setup();
    const inv = await s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: 'bia' });
    const nf = { kind: 'not_found', message: 'Convite não encontrado' };
    await expect(s.accept.execute({ actor: s.ana.actor, inviteId: inv.id })).rejects.toMatchObject(nf);
    await expect(s.accept.execute({ actor: s.admin.actor, inviteId: inv.id })).rejects.toMatchObject(nf);
    await expect(s.decline.execute({ actor: s.admin.actor, inviteId: inv.id })).rejects.toMatchObject(nf);
    await expect(s.decline.execute({ actor: s.bia.actor, inviteId: randomUUID() })).rejects.toMatchObject(nf);
    await s.decline.execute({ actor: s.bia.actor, inviteId: inv.id });
    await expect(s.decline.execute({ actor: s.bia.actor, inviteId: inv.id })).rejects.toMatchObject({ kind: 'conflict' });
    await expect(s.accept.execute({ actor: s.bia.actor, inviteId: inv.id })).rejects.toMatchObject({ kind: 'conflict' });
  });

  it('listas: C4 (pendentes recebidos com rolê e quem convidou) e C8', async () => {
    const s = await setup();
    await s.invite.execute({ actor: s.ana.actor, groupId: s.gid, username: 'bia' });
    const mine = await s.mine.execute({ actor: s.bia.actor });
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ group: { id: s.gid, name: 'Churras' }, inviter: { username: 'ana' } });
    expect(await s.mine.execute({ actor: s.cadu.actor })).toEqual([]);
    const forGroup = await s.listGroup.execute({ actor: s.ana.actor, groupId: s.gid });
    expect(forGroup.map((i) => i.invitee.username)).toEqual(['bia']);
    await expect(s.listGroup.execute({ actor: s.cadu.actor, groupId: s.gid })).rejects.toMatchObject({ kind: 'not_found' });
  });
});
