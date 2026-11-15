import { ConflictError } from '../../../shared/domain/errors';
import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { InMemoryPersonRepository } from '../../people/infrastructure/in-memory-person.repository';
import { User } from '../domain/user.entity';
import { UserRepository, UserWithName } from '../domain/user.repository';
import { Username } from '../domain/value-objects/username.vo';

export class InMemoryUserRepository implements UserRepository {
  private readonly items = new Map<string, User>();

  /** `people` fornece o nome da Person e recebe a marca de vínculo (hasAccount). */
  constructor(private readonly people: InMemoryPersonRepository) {}

  /** Auxiliar de testes: faz o próximo save falhar. */
  failNextSave = false;

  async findById(id: UniqueEntityId): Promise<User | null> {
    return this.items.get(id.value) ?? null;
  }

  async findWithNameById(id: UniqueEntityId): Promise<UserWithName | null> {
    const user = this.items.get(id.value);
    return user ? this.withName(user) : null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    return [...this.items.values()].find((u) => u.username.value === username.value) ?? null;
  }

  async findByPersonId(personId: UniqueEntityId): Promise<User | null> {
    return [...this.items.values()].find((u) => u.personId.equals(personId)) ?? null;
  }

  async save(user: User): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error('falha simulada');
    }
    const dup = [...this.items.values()].find(
      (u) => u.username.value === user.username.value && !u.id.equals(user.id),
    );
    if (dup) throw new ConflictError(`Já existe um usuário "${user.username.value}"`);
    this.items.set(user.id.value, user);
    this.people.markLinkedToUser(user.personId);
  }

  async list(): Promise<UserWithName[]> {
    const all = await Promise.all([...this.items.values()].map((u) => this.withName(u)));
    return all.sort((a, b) => a.user.username.value.localeCompare(b.user.username.value));
  }

  async search(q: string, excludeId: UniqueEntityId, limit: number): Promise<UserWithName[]> {
    const needle = q.toLowerCase();
    return (await this.list())
      .filter((u) => !u.user.id.equals(excludeId))
      .filter(
        (u) => u.user.username.value.includes(needle) || u.name.toLowerCase().includes(needle),
      )
      .slice(0, limit);
  }

  private async withName(user: User): Promise<UserWithName> {
    const person = await this.people.findById(user.personId);
    return { user, name: person?.name.value ?? '' };
  }
}
