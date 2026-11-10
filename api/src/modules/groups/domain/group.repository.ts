import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { Group } from './group.aggregate';

export interface GroupSummary {
  id: string;
  name: string;
  createdAt: Date;
  memberCount: number;
  expenseCount: number;
  totalCents: number;
}

/** Porta de persistência do aggregate Group. */
export interface GroupRepository {
  findById(id: UniqueEntityId): Promise<Group | null>;
  listSummaries(): Promise<GroupSummary[]>;
  save(group: Group): Promise<void>;
  delete(id: UniqueEntityId): Promise<boolean>;
}

export const GROUP_REPOSITORY = Symbol('GROUP_REPOSITORY');
