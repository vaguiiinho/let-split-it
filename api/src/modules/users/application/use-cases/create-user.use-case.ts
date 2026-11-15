import { Clock } from '../../../../shared/domain/clock.port';
import { ConflictError } from '../../../../shared/domain/errors';
import { Person } from '../../../people/domain/person.entity';
import { PersonRepository } from '../../../people/domain/person.repository';
import { PersonName } from '../../../people/domain/value-objects/person-name.vo';
import { PasswordHasher } from '../../domain/password-hasher.port';
import { User } from '../../domain/user.entity';
import { UserRepository } from '../../domain/user.repository';
import { Password } from '../../domain/value-objects/password.vo';
import { UserRole } from '../../domain/value-objects/user-role.vo';
import { Username } from '../../domain/value-objects/username.vo';
import { toUserOutput, UserOutput } from '../dto/user.output';

export type CreateUserInput = { username: string; password: string; name?: string; role?: string; isDemo?: boolean };
export type CreateUserOutput = UserOutput;

export class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly people: PersonRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    const username = Username.create(input.username);
    const password = Password.create(input.password);
    const role = UserRole.create(input.role);
    const name =
      input.name === undefined || input.name === null
        ? PersonName.create(username.value)
        : PersonName.create(input.name);

    if (await this.users.findByUsername(username)) {
      throw new ConflictError(`Já existe um usuário "${username.value}"`);
    }

    const existing = await this.people.findByNameKey(name.key);
    if (existing && (await this.users.findByPersonId(existing.id))) {
      throw new ConflictError(`A pessoa "${existing.name.value}" já está vinculada a outro usuário`);
    }

    const passwordHash = await this.hasher.hash(password.value);
    const now = this.clock.now();
    const person = existing ?? Person.create({ name, pixKey: null }, now);
    const user = User.create({ username, passwordHash, role, personId: person.id, isDemo: input.isDemo === true }, now);

    if (!existing) await this.people.save(person);
    try {
      await this.users.save(user);
    } catch (e) {
      // Person e User são salvos separadamente: desfaz a pessoa recém-criada para não deixá-la órfã.
      if (!existing) await this.people.delete(person.id);
      throw e;
    }
    return toUserOutput(user, person.name.value);
  }
}
