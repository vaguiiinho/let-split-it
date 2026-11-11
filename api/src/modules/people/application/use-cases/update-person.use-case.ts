import { ConflictError, NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { PersonRepository } from '../../domain/person.repository';
import { PersonName } from '../../domain/value-objects/person-name.vo';
import { PixKey } from '../../domain/value-objects/pix-key.vo';
import { PersonOutput, toPersonOutput } from '../dto/person.output';

export type UpdatePersonInput = { personId: string; name?: string; pixKey?: string | null };
export type UpdatePersonOutput = PersonOutput;

export class UpdatePersonUseCase {
  constructor(private readonly repo: PersonRepository) {}

  async execute(input: UpdatePersonInput): Promise<UpdatePersonOutput> {
    const id = UniqueEntityId.create(input.personId);
    if (input.name === undefined && input.pixKey === undefined) {
      throw new ValidationError('Informe ao menos um campo para atualizar');
    }
    const name = input.name === undefined ? undefined : PersonName.create(input.name);
    const pixKey = input.pixKey === undefined ? undefined : PixKey.createOptional(input.pixKey);
    const person = await this.repo.findById(id);
    if (!person) throw new NotFoundError('Pessoa não encontrada');
    if (name) {
      if (name.key !== person.name.key) {
        const other = await this.repo.findByNameKey(name.key);
        if (other && !other.id.equals(person.id)) {
          throw new ConflictError(`Já existe uma pessoa chamada "${name.value}"`);
        }
      }
      person.rename(name);
    }
    if (pixKey !== undefined) person.changePixKey(pixKey);
    await this.repo.save(person);
    return toPersonOutput(person);
  }
}
