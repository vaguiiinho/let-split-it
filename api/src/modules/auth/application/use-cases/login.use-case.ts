import { UnauthorizedError, ValidationError } from '../../../../shared/domain/errors';
import { PasswordHasher } from '../../../users/domain/password-hasher.port';
import { UserRepository } from '../../../users/domain/user.repository';
import { Username } from '../../../users/domain/value-objects/username.vo';
import { toUserOutput, UserOutput } from '../../../users/application/dto/user.output';
import { TokenService } from '../../domain/token-service.port';

export type LoginInput = { username: string; password: string };
export type LoginOutput = { accessToken: string; user: UserOutput };

const INVALID = 'Usuário ou senha inválidos';
/** Hash fictício (scrypt válido) para igualar o tempo de resposta quando o usuário não existe. */
const DUMMY_HASH = 'scrypt$16384$8$1$AAECAwQFBgcICQoLDA0ODw==$1fA3zZ6msle8m7785ACfA+1uYhwxsr6wkEVS29TndJEUyqWXFRkM+RRhiQ89zu7zn6N1+3urXYKkVd3LIycb0w==';

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const password = typeof input.password === 'string' ? input.password : '';
    let found = null;
    try {
      const username = Username.create(input.username);
      found = await this.users.findByUsername(username);
    } catch (e) {
      if (!(e instanceof ValidationError)) throw e;
    }
    const ok = await this.hasher.verify(password, found?.passwordHash ?? DUMMY_HASH);
    if (!found || !ok) throw new UnauthorizedError(INVALID);
    const withName = await this.users.findWithNameById(found.id);
    if (!withName) throw new UnauthorizedError(INVALID);
    const accessToken = this.tokens.sign({ sub: found.id.value, role: found.role.value });
    return { accessToken, user: toUserOutput(withName.user, withName.name) };
  }
}
