import { Person as PersonRow } from '@prisma/client';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Person } from '../domain/person.entity';
import { PersonName } from '../domain/value-objects/person-name.vo';
import { PixKey } from '../domain/value-objects/pix-key.vo';

export function toDomain(row: PersonRow): Person {
  return Person.restore({
    id: UniqueEntityId.create(row.id),
    name: PersonName.create(row.name),
    pixKey: PixKey.createOptional(row.pixKey),
    createdAt: row.createdAt,
  });
}

export function toPersistence(person: Person) {
  return {
    id: person.id.value,
    name: person.name.value,
    nameKey: person.name.key,
    pixKey: person.pixKey?.value ?? null,
    createdAt: person.createdAt,
  };
}
