import { makeActor } from '../../users/testing/fixtures';
import { Group } from '../domain/group.aggregate';
import { GroupName } from '../domain/value-objects/group-name.vo';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { makePerson, makeRepo } from '../testing/fixtures';
import {
  assertCanManage,
  canManage,
  canView,
  findAccessibleGroupOrFail,
  scopeFor,
} from './group-access.policy';

function world(withOwner = true) {
  const owner = makeActor();
  const member = makeActor();
  const stranger = makeActor();
  const admin = makeActor({ role: 'ADMIN' });
  const group = Group.create(
    {
      name: GroupName.create('Churras'),
      ownerId: withOwner ? UniqueEntityId.create(owner.userId) : null,
      ownerPersonId: withOwner ? UniqueEntityId.create(owner.personId) : null,
    },
    new Date(),
  );
  group.addMember(
    (() => {
      const p = makePerson('Membro');
      return Object.assign(p, { id: UniqueEntityId.create(member.personId) });
    })(),
  );
  return { owner, member, stranger, admin, group };
}

describe('GroupAccessPolicy', () => {
  it('matriz ADMIN/dono/membro/estranho × canView/canManage', () => {
    const { owner, member, stranger, admin, group } = world();
    expect([admin, owner, member, stranger].map((a) => canView(a, group))).toEqual([true, true, true, false]);
    expect([admin, owner, member, stranger].map((a) => canManage(a, group))).toEqual([true, true, false, false]);
  });

  it('rolê sem dono: só o ADMIN vê', () => {
    const { owner, stranger, admin, group } = world(false);
    expect(canView(admin, group)).toBe(true);
    expect(canView(owner, group)).toBe(false);
    expect(canView(stranger, group)).toBe(false);
  });

  it('findAccessibleGroupOrFail: 404 para inexistente e inacessível; assertCanManage → 403', async () => {
    const { owner, member, stranger, group } = world();
    const repo = makeRepo();
    await repo.save(group);
    await expect(findAccessibleGroupOrFail(repo, group.id, stranger)).rejects.toMatchObject({
      kind: 'not_found',
      message: 'Rolê não encontrado',
    });
    await expect(findAccessibleGroupOrFail(repo, UniqueEntityId.create(), owner)).rejects.toMatchObject({
      kind: 'not_found',
    });
    expect(await findAccessibleGroupOrFail(repo, group.id, member)).toBe(group);
    expect(() => assertCanManage(member, group)).toThrow('Acesso negado');
    expect(() => assertCanManage(owner, group)).not.toThrow();
  });

  it('scopeFor', () => {
    const a = makeActor();
    expect(scopeFor(a)).toEqual({ kind: 'user', userId: a.userId, personId: a.personId });
    expect(scopeFor(makeActor({ role: 'ADMIN' }))).toEqual({ kind: 'all' });
  });
});
