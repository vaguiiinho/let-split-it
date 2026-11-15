import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import type { GroupScope } from '../../../shared/domain/group-scope';
import { Person } from './person.entity';

export interface PersonSummary {
  person: Person;
  groupCount: number;
  hasAccount: boolean;
}

export interface PersonGroupInfo {
  id: string;
  name: string;
  createdAt: Date;
  memberCount: number;
  totalCents: number;
}

export interface PersonDetail {
  person: Person;
  hasAccount: boolean;
  groups: PersonGroupInfo[];
}

/** Porta de persistência de Person. */
export interface PersonRepository {
  findById(id: UniqueEntityId): Promise<Person | null>;
  findByNameKey(key: string): Promise<Person | null>;
  /** Upsert; violação de unicidade do nome → ConflictError (P1). */
  save(person: Person): Promise<void>;
  delete(id: UniqueEntityId): Promise<boolean>;
  countMemberships(id: UniqueEntityId): Promise<number>;
  count(): Promise<number>;
  /** Vinculada a um User (P7/P8). */
  isLinkedToUser(id: UniqueEntityId): Promise<boolean>;
  /** `groupCount` conta só os rolês visíveis no escopo (P9). */
  listSummaries(scope: GroupScope): Promise<PersonSummary[]>;
  /** `groups` lista só os rolês visíveis no escopo (P9). */
  getDetail(id: UniqueEntityId, scope: GroupScope): Promise<PersonDetail | null>;
}

export const PERSON_REPOSITORY = Symbol('PERSON_REPOSITORY');
