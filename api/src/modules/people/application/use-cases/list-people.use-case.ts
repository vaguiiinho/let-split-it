import { PersonRepository } from '../../domain/person.repository';
import { PersonOutput, toPersonOutput } from '../dto/person.output';

export type ListPeopleInput = Record<string, never>;
export type ListPeopleOutput = (PersonOutput & { groupCount: number })[];

export class ListPeopleUseCase {
  constructor(private readonly repo: PersonRepository) {}

  async execute(_input: ListPeopleInput): Promise<ListPeopleOutput> {
    const items = await this.repo.listSummaries();
    return items
      .map((s) => ({ ...toPersonOutput(s.person), groupCount: s.groupCount }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
}
