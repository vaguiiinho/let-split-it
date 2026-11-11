import { randomUUID } from 'node:crypto';
import { FakeClock, makePeopleRepo, makePerson, makeRepo, seedGroup } from '../../testing/fixtures';
import { AddMemberUseCase } from './add-member.use-case';

async function setup() {
  const repo = makeRepo();
  const people = makePeopleRepo();
  const s = await seedGroup(repo, false, people);
  return { ...s, repo, people, uc: new AddMemberUseCase(repo, people, new FakeClock()) };
}

const MSG_FORMAT = 'Informe uma pessoa existente ou o nome de uma nova pessoa';

describe('AddMemberUseCase', () => {
  it('cria pessoa nova com e sem PIX e vincula ao rolê', async () => {
    const { uc, gid, people } = await setup();
    const out = await uc.execute({ groupId: gid, name: ' Dani ', pixKey: '' });
    expect(out.members.at(-1)).toMatchObject({ name: 'Dani', pixKey: null });
    const out2 = await uc.execute({ groupId: gid, name: 'Edu', pixKey: 'edu@pix.com' });
    expect(out2.members.at(-1)?.pixKey).toBe('edu@pix.com');
    expect(await people.count()).toBe(5);
  });

  it('falha ao salvar o rolê → remove a pessoa recém-criada (sem órfã)', async () => {
    const { uc, gid, people, repo } = await setup();
    const before = await people.count();
    jest.spyOn(repo, 'save').mockRejectedValueOnce(new Error('db down'));
    await expect(uc.execute({ groupId: gid, name: 'Fabi' })).rejects.toThrow('db down');
    expect(await people.count()).toBe(before);
  });

  it('falha ao salvar o rolê → não remove pessoa que já existia', async () => {
    const { uc, gid, people, repo } = await setup();
    const zeca = makePerson('Zeca');
    await people.save(zeca);
    jest.spyOn(repo, 'save').mockRejectedValueOnce(new Error('db down'));
    await expect(uc.execute({ groupId: gid, personId: zeca.id.value })).rejects.toThrow('db down');
    expect(await people.findById(zeca.id)).not.toBeNull();
  });

  it('adiciona pessoa existente por personId', async () => {
    const { uc, gid, people, repo } = await setup();
    const zeca = makePerson('Zeca', 'z@pix.com');
    await people.save(zeca);
    const out = await uc.execute({ groupId: gid, personId: zeca.id.value });
    expect(out.members.at(-1)).toMatchObject({ id: zeca.id.value, name: 'Zeca', pixKey: 'z@pix.com' });
    // a mesma pessoa em outro rolê
    const other = await seedGroup(repo, false);
    const out2 = await uc.execute({ groupId: other.gid, personId: zeca.id.value });
    expect(out2.members.at(-1)?.id).toBe(zeca.id.value);
  });

  it('{name} existente reaproveita a pessoa (sem criar outra)', async () => {
    const { uc, gid, people } = await setup();
    const dani = makePerson('Dani', 'd@pix.com');
    await people.save(dani);
    const before = await people.count();
    const out = await uc.execute({ groupId: gid, name: ' DANI ' });
    expect(out.members.at(-1)?.id).toBe(dani.id.value);
    const out2 = await uc.execute({ groupId: gid, name: 'ana' }).catch((e: unknown) => e);
    expect(out2).toMatchObject({ kind: 'conflict', message: 'Ana já está neste rolê' });
    expect(await people.count()).toBe(before);
  });

  it('{name, pixKey} com chave diferente ou pessoa sem chave → 409', async () => {
    const { uc, gid, people } = await setup();
    const dani = makePerson('Dani');
    const edu = makePerson('Edu', 'e@pix.com');
    await people.save(dani);
    await people.save(edu);
    const msg =
      'com outra chave PIX. Selecione-a na lista ou edite a pessoa';
    await expect(uc.execute({ groupId: gid, name: 'Dani', pixKey: 'x@pix.com' })).rejects.toMatchObject({
      kind: 'conflict',
      message: `Já existe uma pessoa chamada "Dani" ${msg}`,
    });
    await expect(uc.execute({ groupId: gid, name: 'Edu', pixKey: 'outra@pix.com' })).rejects.toMatchObject({
      kind: 'conflict',
    });
    const ok = await uc.execute({ groupId: gid, name: 'Edu', pixKey: 'e@pix.com' });
    expect(ok.members.at(-1)?.id).toBe(edu.id.value);
  });

  it('400 para combinações inválidas do formato', async () => {
    const { uc, gid, ana } = await setup();
    const personId = ana.id.value;
    for (const input of [{}, { personId, name: 'X' }, { pixKey: 'a@b.c' }]) {
      await expect(uc.execute({ groupId: gid, ...input })).rejects.toMatchObject({
        kind: 'validation',
        message: MSG_FORMAT,
      });
    }
    await expect(uc.execute({ groupId: gid, personId, pixKey: 'a@b.c' })).rejects.toMatchObject({
      kind: 'validation',
      message: 'Chave PIX só pode ser informada ao criar uma nova pessoa',
    });
  });

  it('400 nome/PIX/ids inválidos', async () => {
    const { uc, gid } = await setup();
    await expect(uc.execute({ groupId: gid, name: '' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ groupId: gid, name: 'X', pixKey: 'a b' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ groupId: gid, personId: 'x' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(uc.execute({ groupId: 'x', name: 'X' })).rejects.toMatchObject({ kind: 'validation' });
  });

  it('404 rolê inexistente não cria pessoa; 404 pessoa inexistente; 409 já está no rolê', async () => {
    const { uc, gid, people, ana } = await setup();
    const before = await people.count();
    await expect(uc.execute({ groupId: randomUUID(), name: 'X' })).rejects.toMatchObject({ kind: 'not_found' });
    expect(await people.count()).toBe(before);
    await expect(uc.execute({ groupId: gid, personId: randomUUID() })).rejects.toMatchObject({
      kind: 'not_found',
      message: 'Pessoa não encontrada',
    });
    await expect(uc.execute({ groupId: gid, personId: ana.id.value })).rejects.toMatchObject({
      kind: 'conflict',
      message: 'Ana já está neste rolê',
    });
  });
});
