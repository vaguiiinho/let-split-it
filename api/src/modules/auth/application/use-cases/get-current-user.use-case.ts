import type { Actor } from '../../../../shared/domain/actor';
import { UnauthorizedError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { GroupInviteRepository } from '../../../groups/domain/group-invite.repository';
import { toUserOutput, UserOutput } from '../../../users/application/dto/user.output';
import { UserRepository } from '../../../users/domain/user.repository';

export type GetCurrentUserInput = { actor: Actor };
export type GetCurrentUserOutput = UserOutput & { pendingInviteCount: number };

export class GetCurrentUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly invites: GroupInviteRepository,
  ) {}

  async execute(input: GetCurrentUserInput): Promise<GetCurrentUserOutput> {
    const id = UniqueEntityId.create(input.actor.userId);
    const found = await this.users.findWithNameById(id);
    if (!found) throw new UnauthorizedError('Sessão expirada ou inválida');
    const pendingInviteCount = await this.invites.countPendingForInvitee(id);
    return { ...toUserOutput(found.user, found.name), pendingInviteCount };
  }
}
