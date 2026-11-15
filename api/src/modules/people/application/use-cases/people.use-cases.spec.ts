import { randomUUID } from 'node:crypto';
import { makePeopleRepo } from '../../testing/fixtures';
import { makeActor } from '../../../users/testing/fixtures';
import { CreatePersonUseCase } from './create-person.use-case';
import { DeletePersonUseCase } from './delete-person.use-case';
import { GetPersonUseCase } from './get-person.use-case';
import { ListPeopleUseCase } from './list-people.use-case';
import { UpdatePersonUseCase } from './update-person.use-case';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';

const actor = makeActor({ role: 'ADMIN' });
const clock = { now: () => new Date('2026-01-01T00:00:00Z') };

function setup() {
  const repo = makePeopleRepo();
  return {
    repo,
    create: new CreatePersonUseCase(repo, clock),
    list: new ListPeopleUseCase(repo),
    get: new GetPersonUseCase(repo),
    update: new UpdatePersonUseCase(repo),
    del: new DeletePersonUseCase(repo),
  };
}

describe('people use cases', () => {
  it('cria pessoa; nome duplicado (case-insensitive) → 409 P1', async () => {
    const { create } = setup();
    const out = await create.execute({ name: ' Ana ', pixKey: 'ana@pix.com' });
    expect(out).toMatchObject({ name: 'Ana', pixKey: 'ana@pix.com', createdAt: '2026-01-01T00:00:00.000Z' });
    await expect(create.execute({ name: ' ANA ' })).rejects.toMatchObject({
      kind: 'conflict',
      message: 'Já existe uma pessoa chamada "ANA"',
    });
    await expect(create.execute({ name: '' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(create.execute({ name: 'X', pixKey: 'a b' })).rejects.toMatchObject({ kind: 'validation' });
  });

  it('lista ordenada por nome com groupCount', async () => {
    const { create, list, repo } = setup();
    const b = await create.execute({ name: 'Bia' });
    await create.execute({ name: 'ana' });
    await create.execute({ name: 'Ávila' });
    repo.link(UniqueEntityId.create(b.id), {
      id: randomUUID(), name: 'R', createdAt: new Date(), memberCount: 1, totalCents: 0,
    });
    const out = await list.execute({ actor });
    expect(out.map((p) => p.name)).toEqual(['ana', 'Ávila', 'Bia']);
    expect(out.map((p) => p.groupCount)).toEqual([0, 0, 1]);
  });

  it('get: rolês por createdAt desc; 400 id; 404', async () => {
    const { create, get, repo } = setup();
    const a = await create.execute({ name: 'Ana' });
    const id = UniqueEntityId.create(a.id);
    repo.link(id, { id: 'g1', name: 'Velho', createdAt: new Date('2026-01-01'), memberCount: 2, totalCents: 10 });
    repo.link(id, { id: 'g2', name: 'Novo', createdAt: new Date('2026-02-01'), memberCount: 3, totalCents: 20 });
    const out = await get.execute({ actor, personId: a.id });
    expect(out.groups.map((g) => g.name)).toEqual(['Novo', 'Velho']);
    await expect(get.execute({ actor, personId: 'x' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(get.execute({ actor, personId: randomUUID() })).rejects.toMatchObject({
      kind: 'not_found',
      message: 'Pessoa não encontrada',
    });
  });

  it('update: renomear com outra caixa ok; nome de outra → 409; P3; pixKey null limpa', async () => {
    const { create, update } = setup();
    const a = await create.execute({ name: 'Ana', pixKey: 'ana@pix.com' });
    await create.execute({ name: 'Bia' });
    expect((await update.execute({ actor, personId: a.id, name: 'ANA' })).name).toBe('ANA');
    await expect(update.execute({ actor, personId: a.id, name: 'bia' })).rejects.toMatchObject({ kind: 'conflict' });
    await expect(update.execute({ actor, personId: a.id })).rejects.toMatchObject({
      kind: 'validation',
      message: 'Informe ao menos um campo para atualizar',
    });
    expect((await update.execute({ actor, personId: a.id, pixKey: null })).pixKey).toBeNull();
    expect((await update.execute({ actor, personId: a.id, pixKey: 'x@y.z' })).pixKey).toBe('x@y.z');
    expect((await update.execute({ actor, personId: a.id, pixKey: '' })).pixKey).toBeNull();
    await expect(update.execute({ actor, personId: a.id, name: '' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(update.execute({ actor, personId: 'x', name: 'A' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(update.execute({ actor, personId: randomUUID(), name: 'A' })).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('P10: Person com conta só é editada pelo próprio usuário ou por ADMIN', async () => {
    const { create, update, repo } = setup();
    const a = await create.execute({ name: 'Ana' });
    repo.markLinkedToUser(UniqueEntityId.create(a.id));
    const other = makeActor({ role: 'USER' });
    await expect(update.execute({ actor: other, personId: a.id, pixKey: 'x@y.z' })).rejects.toMatchObject({
      kind: 'forbidden',
      message: 'Só o próprio usuário ou um admin pode editar esta pessoa',
    });
    const self = makeActor({ role: 'USER', personId: a.id });
    expect((await update.execute({ actor: self, personId: a.id, pixKey: 'a@y.z' })).pixKey).toBe('a@y.z');
    expect((await update.execute({ actor, personId: a.id, pixKey: 'b@y.z' })).pixKey).toBe('b@y.z');
    const b = await create.execute({ name: 'Bia' });
    expect((await update.execute({ actor: other, personId: b.id, name: 'Bia S' })).name).toBe('Bia S');
  });

  it('delete: 409 com vínculo, ok sem vínculo, 400 id, 404', async () => {
    const { create, del, repo, list } = setup();
    const a = await create.execute({ name: 'Ana' });
    const b = await create.execute({ name: 'Bia' });
    repo.link(UniqueEntityId.create(a.id), { id: 'g', name: 'R', createdAt: new Date(), memberCount: 1, totalCents: 0 });
    await expect(del.execute({ personId: a.id })).rejects.toMatchObject({
      kind: 'conflict',
      message: 'Não é possível excluir uma pessoa que participa de algum rolê',
    });
    await del.execute({ personId: b.id });
    expect(await list.execute({ actor })).toHaveLength(1);
    await expect(del.execute({ personId: 'x' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(del.execute({ personId: randomUUID() })).rejects.toMatchObject({ kind: 'not_found' });
  });
});

describe('people: contas e visibilidade (P7/P8/P9)', () => {
  it('P7: excluir Person vinculada → 409, mesmo sem rolês; P8: hasAccount só para quem tem User', async () => {
    const { create, del, list, repo } = setup();
    const a = await create.execute({ name: 'Ana' });
    const b = await create.execute({ name: 'Bia' });
    repo.markLinkedToUser(UniqueEntityId.create(a.id));
    await expect(del.execute({ personId: a.id })).rejects.toMatchObject({
      kind: 'conflict',
      message: 'Não é possível excluir uma pessoa vinculada a um usuário',
    });
    const out = await list.execute({ actor });
    expect(out.map((p) => [p.name, p.hasAccount])).toEqual([['Ana', true], ['Bia', false]]);
    expect(b.hasAccount).toBe(false);
  });

  it('P9: USER só vê os rolês visíveis a ele em get/list; ADMIN vê todos; create grava createdById', async () => {
    const { create, get, list, repo } = setup();
    const user = makeActor();
    const p = await create.execute({ name: 'Ana', actor: user });
    expect(repo.findById(UniqueEntityId.create(p.id))).resolves.toMatchObject({
      createdById: { value: user.userId },
    });
    const id = UniqueEntityId.create(p.id);
    repo.link(id, { id: 'g1', name: 'Meu', createdAt: new Date('2026-01-01'), memberCount: 1, totalCents: 0 }, [user.userId]);
    repo.link(id, { id: 'g2', name: 'Alheio', createdAt: new Date('2026-02-01'), memberCount: 1, totalCents: 0 }, ['outro']);
    expect((await get.execute({ actor: user, personId: p.id })).groups.map((g) => g.name)).toEqual(['Meu']);
    expect((await list.execute({ actor: user }))[0].groupCount).toBe(1);
    expect((await get.execute({ actor, personId: p.id })).groups).toHaveLength(2);
    expect((await list.execute({ actor }))[0].groupCount).toBe(2);
  });
});
