import { Group } from '../domain/group';

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
  findById(id: string): Promise<Group | null>;
  listSummaries(): Promise<GroupSummary[]>;
  save(group: Group): Promise<void>;
  delete(id: string): Promise<boolean>;
}

export const GROUP_REPOSITORY = Symbol('GROUP_REPOSITORY');

export interface IdGenerator {
  next(): string;
}

export interface Clock {
  now(): Date;
}

export const ID_GENERATOR = Symbol('ID_GENERATOR');
export const CLOCK = Symbol('CLOCK');
