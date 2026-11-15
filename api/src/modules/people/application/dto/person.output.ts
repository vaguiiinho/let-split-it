import { Person } from '../../domain/person.entity';

export type PersonOutput = {
  id: string;
  name: string;
  pixKey: string | null;
  hasAccount: boolean;
  createdAt: string;
};

export function toPersonOutput(person: Person, hasAccount: boolean): PersonOutput {
  return {
    id: person.id.value,
    name: person.name.value,
    pixKey: person.pixKey?.value ?? null,
    hasAccount,
    createdAt: person.createdAt.toISOString(),
  };
}
