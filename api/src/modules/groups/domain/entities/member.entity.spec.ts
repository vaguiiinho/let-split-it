import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { MemberName } from '../value-objects/member-name.vo';
import { PixKey } from '../value-objects/pix-key.vo';
import { Member } from './member.entity';

describe('Member', () => {
  it('create gera id; restore preserva', () => {
    const m = Member.create({ name: MemberName.create('Ana'), pixKey: PixKey.createOptional('a@b.c') });
    expect(m.id.value).toHaveLength(36);
    const id = UniqueEntityId.create();
    const r = Member.restore({ id, name: m.name, pixKey: null });
    expect(r.id.equals(id)).toBe(true);
    expect(r.pixKey).toBeNull();
    expect(Member.create({ name: m.name, pixKey: null }, id).id.equals(id)).toBe(true);
  });
});
