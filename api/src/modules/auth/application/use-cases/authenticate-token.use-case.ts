import type { Actor } from '../../../../shared/domain/actor';
import { UnauthorizedError, ValidationError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { UserRepository } from '../../../users/domain/user.repository';
import { TokenService } from '../../domain/token-service.port';

export type AuthenticateTokenInput = { authorization?: string };
export type AuthenticateTokenOutput = Actor;

const INVALID = 'Sessão expirada ou inválida';

export class AuthenticateTokenUseCase {
  constructor(
    private readonly tokens: TokenService,
    private readonly users: UserRepository,
  ) {}

  async execute(input: AuthenticateTokenInput): Promise<AuthenticateTokenOutput> {
    const header = input.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ') || header.length <= 7) {
      throw new UnauthorizedError('Não autenticado');
    }
    const claims = this.tokens.verify(header.slice(7).trim());
    let id: UniqueEntityId;
    try {
      id = UniqueEntityId.create(claims.sub);
    } catch (e) {
      if (e instanceof ValidationError) throw new UnauthorizedError(INVALID);
      throw e;
    }
    const user = await this.users.findById(id);
    if (!user) throw new UnauthorizedError(INVALID);
    // O papel vem do banco (D6): alterações valem na hora.
    return { userId: user.id.value, personId: user.personId.value, role: user.role.value };
  }
}
