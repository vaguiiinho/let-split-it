import { NotFoundError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { PersonRepository } from '../../domain/person.repository';
import { PersonOutput, toPersonOutput } from '../dto/person.output';

export type GetPersonInput = { personId: string };
export type GetPersonOutput = PersonOutput & {
  groups: { id: string; name: string; createdAt: string; memberCount: number; totalCents: number }[];
};

export class GetPersonUseCase {
  constructor(private readonly repo: PersonRepository) {}

  async execute(input: GetPersonInput): Promise<GetPersonOutput> {
    const detail = await this.repo.getDetail(UniqueEntityId.create(input.personId));
    if (!detail) throw new NotFoundError('Pessoa não encontrada');
    return {
      ...toPersonOutput(detail.person),
      groups: [...detail.groups]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((g) => ({
          id: g.id,
          name: g.name,
          createdAt: g.createdAt.toISOString(),
          memberCount: g.memberCount,
          totalCents: g.totalCents,
        })),
    };
  }
}
