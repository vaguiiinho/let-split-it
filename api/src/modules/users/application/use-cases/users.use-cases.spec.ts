import { Person } from '../../../people/domain/person.entity';
import { PersonName } from '../../../people/domain/value-objects/person-name.vo';
import { FakeHasher, makeUser, makeUserRepo } from '../../testing/fixtures';
import { CreateUserUseCase } from './create-user.use-case';
import { ListUsersUseCase } from './list-users.use-case';
import { SearchUsersUseCase } from './search-users.use-case';

const clock = { now: () => new Date('2026-01-01T00:00:00Z') };

function setup() {
  const repos = makeUserRepo();
  const hasher = new FakeHasher();
  return {
    ...repos,
    hasher,
    create: new CreateUserUseCase(repos.users, repos.people, hasher, clock),
    list: new ListUsersUseCase(repos.users),
    search: new SearchUsersUseCase(repos.users),
  };
}

describe('CreateUserUseCase', () => {
  it('cria Person com nome = username por padrão e role USER', async () => {
    const { create, people } = setup();
    const out = await create.execute({ username: ' Huguinho ', password: 'huguinho123' });
    expect(out).toMatchObject({ username: 'huguinho', name: 'huguinho', role: 'USER', isDemo: false });
    expect(out).not.toHaveProperty('passwordHash');
    expect(await people.count()).toBe(1);
  });

  it('username existente em outra caixa → 409 U2', async () => {
    const { create } = setup();
    await create.execute({ username: 'ana', password: 'senha1234' });
    await expect(create.execute({ username: 'ANA', password: 'senha1234' })).rejects.toMatchObject({
      kind: 'conflict',
      message: 'Já existe um usuário "ana"',
    });
  });

  it('reaproveita Person existente sem usuário (U5)', async () => {
    const { create, people } = setup();
    const p = Person.create({ name: PersonName.create('Ana'), pixKey: null }, new Date());
    await people.save(p);
    const out = await create.execute({ username: 'ana2', password: 'senha1234', name: 'ANA' });
    expect(out.personId).toBe(p.id.value);
    expect(await people.count()).toBe(1);
  });

  it('Person já vinculada → 409 e nenhum User novo', async () => {
    const { create, users, people } = setup();
    await create.execute({ username: 'ana', password: 'senha1234', name: 'Ana' });
    await expect(
      create.execute({ username: 'ana2', password: 'senha1234', name: 'ana' }),
    ).rejects.toMatchObject({
      kind: 'conflict',
      message: 'A pessoa "Ana" já está vinculada a outro usuário',
    });
    expect(await users.list()).toHaveLength(1);
    expect(await people.count()).toBe(1);
  });

  it('falha no save do User remove a Person recém-criada, mas não a existente', async () => {
    const { create, users, people } = setup();
    users.failNextSave = true;
    await expect(create.execute({ username: 'bia', password: 'senha1234' })).rejects.toThrow('falha simulada');
    expect(await people.count()).toBe(0);
    const p = Person.create({ name: PersonName.create('Cadu'), pixKey: null }, new Date());
    await people.save(p);
    users.failNextSave = true;
    await expect(
      create.execute({ username: 'cadu', password: 'senha1234', name: 'Cadu' }),
    ).rejects.toThrow('falha simulada');
    expect(await people.findById(p.id)).not.toBeNull();
  });

  it('valida VOs (400)', async () => {
    const { create } = setup();
    await expect(create.execute({ username: 'ab', password: 'senha1234' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(create.execute({ username: 'abc', password: '1234567' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(create.execute({ username: 'abc', password: 'senha1234', role: 'ROOT' })).rejects.toMatchObject({
      message: 'Papel inválido',
    });
  });
});

describe('ListUsersUseCase / SearchUsersUseCase', () => {
  it('lista por username asc', async () => {
    const { create, list } = setup();
    await create.execute({ username: 'zeze', password: 'senha1234' });
    await create.execute({ username: 'ana', password: 'senha1234', role: 'ADMIN' });
    expect((await list.execute({})).map((u) => u.username)).toEqual(['ana', 'zeze']);
  });

  it('search: q curto → 400; exclui o próprio ator; busca por username e nome; limita a 10', async () => {
    const r = setup();
    const me = await makeUser(r, 'luiz.eu');
    await makeUser(r, 'luizinho');
    await makeUser(r, 'zezinho', { name: 'Luiza Souza' });
    await makeUser(r, 'outro');
    await expect(r.search.execute({ actor: me.actor, q: 'a' })).rejects.toMatchObject({
      kind: 'validation',
      message: 'Informe de 2 a 30 caracteres para buscar',
    });
    await expect(r.search.execute({ actor: me.actor, q: ' ' })).rejects.toMatchObject({ kind: 'validation' });
    const out = await r.search.execute({ actor: me.actor, q: ' LUIZ ' });
    expect(out.map((u) => u.username)).toEqual(['luizinho', 'zezinho']);
    for (let i = 0; i < 12; i++) await makeUser(r, `massa${String(i).padStart(2, '0')}`);
    expect(await r.search.execute({ actor: me.actor, q: 'massa' })).toHaveLength(10);
  });
});
