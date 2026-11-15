import { User as UserRow } from '@prisma/client';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { User } from '../domain/user.entity';
import { UserRole } from '../domain/value-objects/user-role.vo';
import { Username } from '../domain/value-objects/username.vo';

export function toDomain(row: UserRow): User {
  return User.restore({
    id: UniqueEntityId.create(row.id),
    username: Username.create(row.username),
    passwordHash: row.passwordHash,
    role: UserRole.create(row.role),
    personId: UniqueEntityId.create(row.personId),
    isDemo: row.isDemo,
    createdAt: row.createdAt,
  });
}

export function toPersistence(user: User) {
  return {
    id: user.id.value,
    username: user.username.value,
    passwordHash: user.passwordHash,
    role: user.role.value,
    personId: user.personId.value,
    isDemo: user.isDemo,
    createdAt: user.createdAt,
  };
}
