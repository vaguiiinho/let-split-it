import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { Actor } from '../../../shared/domain/actor';
import { CurrentUser } from '../../../shared/presentation/auth.decorators';
import { AcceptInviteUseCase } from '../application/use-cases/accept-invite.use-case';
import { DeclineInviteUseCase } from '../application/use-cases/decline-invite.use-case';
import { ListMyInvitesUseCase } from '../application/use-cases/list-my-invites.use-case';

@Controller('invites')
export class InvitesController {
  constructor(
    private readonly listMyInvites: ListMyInvitesUseCase,
    private readonly acceptInvite: AcceptInviteUseCase,
    private readonly declineInvite: DeclineInviteUseCase,
  ) {}

  @Get()
  list(@CurrentUser() actor: Actor) {
    return this.listMyInvites.execute({ actor });
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.acceptInvite.execute({ actor, inviteId: id });
  }

  @Post(':id/decline')
  @HttpCode(204)
  async decline(@Param('id') id: string, @CurrentUser() actor: Actor): Promise<void> {
    await this.declineInvite.execute({ actor, inviteId: id });
  }
}
