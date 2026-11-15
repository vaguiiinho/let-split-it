import type { Actor } from '../../../../shared/domain/actor';
import { scopeFor } from '../../../../shared/domain/scope-for';
import { PersonRepository } from '../../domain/person.repository';
import { PersonOutput, toPersonOutput } from '../dto/person.output';

export type ListPeopleInput = { actor: Actor };
export type ListPeopleOutput = (PersonOutput & { groupCount: number })[];

export class ListPeopleUseCase {
  constructor(private readonly repo: PersonRepository) {}

  async execute(input: ListPeopleInput): Promise<ListPeopleOutput> {
    const items = await this.repo.listSummaries(scopeFor(input.actor));
    return items
      .map((s) => ({ ...toPersonOutput(s.person, s.hasAccount), groupCount: s.groupCount }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
}
