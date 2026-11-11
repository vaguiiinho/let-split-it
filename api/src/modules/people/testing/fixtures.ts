import { InMemoryPersonRepository } from '../infrastructure/in-memory-person.repository';

export function makePeopleRepo(): InMemoryPersonRepository {
  return new InMemoryPersonRepository();
}
