import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Person } from './person.entity';

export interface PersonSummary {
  person: Person;
  groupCount: number;
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
  listSummaries(): Promise<PersonSummary[]>;
  getDetail(id: UniqueEntityId): Promise<PersonDetail | null>;
}

export const PERSON_REPOSITORY = Symbol('PERSON_REPOSITORY');
