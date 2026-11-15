import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { User } from './user.entity';
import { Username } from './value-objects/username.vo';

/** Usuário + nome da Person vinculada. */
export interface UserWithName {
  user: User;
  name: string;
}

/** Porta de persistência de User. */
export interface UserRepository {
  findById(id: UniqueEntityId): Promise<User | null>;
  findWithNameById(id: UniqueEntityId): Promise<UserWithName | null>;
  findByUsername(username: Username): Promise<User | null>;
  findByPersonId(personId: UniqueEntityId): Promise<User | null>;
  /** Upsert; violação de unicidade do username → ConflictError (U2). */
  save(user: User): Promise<void>;
  /** Ordenado por username asc. */
  list(): Promise<UserWithName[]>;
  /** Contains (sem caixa) em username ou nome da Person; exclui `excludeId`; username asc. */
  search(q: string, excludeId: UniqueEntityId, limit: number): Promise<UserWithName[]>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
