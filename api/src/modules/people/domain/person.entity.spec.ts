import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Person } from './person.entity';
import { PersonName } from './value-objects/person-name.vo';
import { PixKey } from './value-objects/pix-key.vo';

describe('Person', () => {
  const at = new Date(Date.UTC(2026, 0, 1));

  it('create gera id; restore preserva', () => {
    const p = Person.create({ name: PersonName.create('Ana'), pixKey: PixKey.createOptional('a@b.c') }, at);
    expect(p.id.value).toHaveLength(36);
    expect(p.createdAt).toBe(at);
    const id = UniqueEntityId.create();
    expect(Person.create({ name: p.name, pixKey: null }, at, id).id.equals(id)).toBe(true);
    const r = Person.restore({ id, name: p.name, pixKey: null, createdAt: at });
    expect(r.id.equals(id)).toBe(true);
    expect(r.pixKey).toBeNull();
  });

  it('rename e changePixKey', () => {
    const p = Person.create({ name: PersonName.create('Ana'), pixKey: null }, at);
    p.rename(PersonName.create('Ana Maria'));
    p.changePixKey(PixKey.createOptional('x@y.z'));
    expect(p.name.value).toBe('Ana Maria');
    expect(p.pixKey?.value).toBe('x@y.z');
    p.changePixKey(null);
    expect(p.pixKey).toBeNull();
  });
});
