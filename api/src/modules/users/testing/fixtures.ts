import type { Actor } from '../../../shared/domain/actor';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Person } from '../../people/domain/person.entity';
import { PersonName } from '../../people/domain/value-objects/person-name.vo';
import { InMemoryPersonRepository } from '../../people/infrastructure/in-memory-person.repository';
import { PasswordHasher } from '../domain/password-hasher.port';
import { User } from '../domain/user.entity';
import { UserRole } from '../domain/value-objects/user-role.vo';
import { Username } from '../domain/value-objects/username.vo';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';

export function makeActor(overrides: Partial<Actor> = {}): Actor {
  return {
    userId: UniqueEntityId.create().value,
    personId: UniqueEntityId.create().value,
    role: 'USER',
    ...overrides,
  };
}

/** Hasher rápido e determinístico para testes de use case. */
export class FakeHasher implements PasswordHasher {
  calls = { hash: 0, verify: 0 };
  async hash(plain: string): Promise<string> {
    this.calls.hash += 1;
    return `fake:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    this.calls.verify += 1;
    return hash === `fake:${plain}`;
  }
}

export function makeUserRepo(people = new InMemoryPersonRepository()) {
  return { users: new InMemoryUserRepository(people), people };
}

/** Cria Person + User (salvos nos repositórios) e devolve o Actor correspondente. */
export async function makeUser(
  repos: { users: InMemoryUserRepository; people: InMemoryPersonRepository },
  username: string,
  opts: { role?: 'USER' | 'ADMIN'; password?: string; isDemo?: boolean; name?: string } = {},
) {
  const person = Person.create(
    { name: PersonName.create(opts.name ?? username), pixKey: null },
    new Date(Date.UTC(2026, 0, 1)),
  );
  await repos.people.save(person);
  const user = User.create(
    {
      username: Username.create(username),
      passwordHash: `fake:${opts.password ?? 'senha1234'}`,
      role: UserRole.create(opts.role),
      personId: person.id,
      isDemo: opts.isDemo,
    },
    new Date(Date.UTC(2026, 0, 1)),
  );
  await repos.users.save(user);
  const actor: Actor = {
    userId: user.id.value,
    personId: person.id.value,
    role: user.role.value,
  };
  return { user, person, actor };
}

export { InMemoryUserRepository };
export { HmacJwtTokenService } from '../../auth/infrastructure/hmac-jwt-token.service';
