import { ConflictError, NotFoundError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { PersonRepository } from '../../domain/person.repository';

export type DeletePersonInput = { personId: string };
export type DeletePersonOutput = void;

export class DeletePersonUseCase {
  constructor(private readonly repo: PersonRepository) {}

  async execute(input: DeletePersonInput): Promise<DeletePersonOutput> {
    const id = UniqueEntityId.create(input.personId);
    if (!(await this.repo.findById(id))) throw new NotFoundError('Pessoa não encontrada');
    if ((await this.repo.countMemberships(id)) > 0) {
      throw new ConflictError('Não é possível excluir uma pessoa que participa de algum rolê');
    }
    await this.repo.delete(id);
  }
}
