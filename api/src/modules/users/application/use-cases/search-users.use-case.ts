import { ValidationError } from '../../../../shared/domain/errors';
import type { Actor } from '../../../../shared/domain/actor';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { UserRepository } from '../../domain/user.repository';

export type SearchUsersInput = { actor: Actor; q: string };
export type SearchUsersOutput = { id: string; username: string; name: string }[];

const LIMIT = 10;

export class SearchUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(input: SearchUsersInput): Promise<SearchUsersOutput> {
    const q = typeof input.q === 'string' ? input.q.trim() : '';
    if (q.length < 2 || q.length > 30) {
      throw new ValidationError('Informe de 2 a 30 caracteres para buscar');
    }
    const found = await this.users.search(q, UniqueEntityId.create(input.actor.userId), LIMIT);
    return found.map((u) => ({ id: u.user.id.value, username: u.user.username.value, name: u.name }));
  }
}
