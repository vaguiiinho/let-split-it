import { NotFoundError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupRepository } from '../../domain/group.repository';

export type DeleteGroupInput = { groupId: string };
export type DeleteGroupOutput = void;

export class DeleteGroupUseCase {
  constructor(private readonly repo: GroupRepository) {}

  async execute(input: DeleteGroupInput): Promise<DeleteGroupOutput> {
    const deleted = await this.repo.delete(UniqueEntityId.create(input.groupId));
    if (!deleted) throw new NotFoundError('Rolê não encontrado');
  }
}
