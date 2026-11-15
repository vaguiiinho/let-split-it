import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import type { GroupScope } from '../../../shared/domain/group-scope';
import { Group } from './group.aggregate';

export interface GroupSummary {
  id: string;
  name: string;
  createdAt: Date;
  memberCount: number;
  expenseCount: number;
  totalCents: number;
}

export type { GroupScope };

/** Porta de persistência do aggregate Group. */
export interface GroupRepository {
  findById(id: UniqueEntityId): Promise<Group | null>;
  findAll(scope: GroupScope): Promise<Group[]>;
  listSummaries(scope: GroupScope): Promise<GroupSummary[]>;
  /** Pessoas distintas nos rolês visíveis (R6). */
  countVisiblePeople(scope: GroupScope): Promise<number>;
  save(group: Group): Promise<void>;
  delete(id: UniqueEntityId): Promise<boolean>;
}

export const GROUP_REPOSITORY = Symbol('GROUP_REPOSITORY');
