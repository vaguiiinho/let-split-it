import { Clock } from '../../../../shared/domain/clock.port';
import { ConflictError } from '../../../../shared/domain/errors';
import { Person } from '../../domain/person.entity';
import { PersonRepository } from '../../domain/person.repository';
import { PersonName } from '../../domain/value-objects/person-name.vo';
import { PixKey } from '../../domain/value-objects/pix-key.vo';
import { PersonOutput, toPersonOutput } from '../dto/person.output';

export type CreatePersonInput = { name: string; pixKey?: string | null };
export type CreatePersonOutput = PersonOutput;

export class CreatePersonUseCase {
  constructor(
    private readonly repo: PersonRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreatePersonInput): Promise<CreatePersonOutput> {
    const name = PersonName.create(input.name);
    const pixKey = PixKey.createOptional(input.pixKey);
    if (await this.repo.findByNameKey(name.key)) {
      throw new ConflictError(`Já existe uma pessoa chamada "${name.value}"`);
    }
    const person = Person.create({ name, pixKey }, this.clock.now());
    await this.repo.save(person);
    return toPersonOutput(person);
  }
}
