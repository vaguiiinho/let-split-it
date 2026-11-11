import { Person } from '../../domain/person.entity';

export type PersonOutput = {
  id: string;
  name: string;
  pixKey: string | null;
  createdAt: string;
};

export function toPersonOutput(person: Person): PersonOutput {
  return {
    id: person.id.value,
    name: person.name.value,
    pixKey: person.pixKey?.value ?? null,
    createdAt: person.createdAt.toISOString(),
  };
}
