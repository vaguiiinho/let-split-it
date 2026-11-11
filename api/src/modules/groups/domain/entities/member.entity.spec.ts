import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { Person } from '../../../people/domain/person.entity';
import { PersonName } from '../../../people/domain/value-objects/person-name.vo';
import { PixKey } from '../../../people/domain/value-objects/pix-key.vo';
import { Member } from './member.entity';

describe('Member', () => {
  it('fromPerson usa o id da pessoa; restore preserva', () => {
    const person = Person.create(
      { name: PersonName.create('Ana'), pixKey: PixKey.createOptional('a@b.c') },
      new Date(),
    );
    const m = Member.fromPerson(person);
    expect(m.id.equals(person.id)).toBe(true);
    expect(m.name.value).toBe('Ana');
    expect(m.pixKey?.value).toBe('a@b.c');
    const id = UniqueEntityId.create();
    const r = Member.restore({ id, name: m.name, pixKey: null });
    expect(r.id.equals(id)).toBe(true);
    expect(r.pixKey).toBeNull();
  });
});
