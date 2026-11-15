import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { Actor } from '../../../shared/domain/actor';
import { CurrentUser } from '../../../shared/presentation/auth.decorators';
import { InviteUserUseCase } from '../application/use-cases/invite-user.use-case';
import { ListGroupInvitesUseCase } from '../application/use-cases/list-group-invites.use-case';
import { AddExpenseUseCase } from '../application/use-cases/add-expense.use-case';
import { AddMemberUseCase } from '../application/use-cases/add-member.use-case';
import { CreateGroupUseCase } from '../application/use-cases/create-group.use-case';
import { DeleteGroupUseCase } from '../application/use-cases/delete-group.use-case';
import { GetGroupUseCase } from '../application/use-cases/get-group.use-case';
import { GetSettlementUseCase } from '../application/use-cases/get-settlement.use-case';
import { ListGroupsUseCase } from '../application/use-cases/list-groups.use-case';
import { UpdateGroupUseCase } from '../application/use-cases/update-group.use-case';
import { RegisterPaymentUseCase } from '../application/use-cases/register-payment.use-case';
import { RemoveExpenseUseCase } from '../application/use-cases/remove-expense.use-case';
import { RemoveMemberUseCase } from '../application/use-cases/remove-member.use-case';
import { RemovePaymentUseCase } from '../application/use-cases/remove-payment.use-case';
import { AddExpenseDto } from './dto/add-expense.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly createGroup: CreateGroupUseCase,
    private readonly listGroups: ListGroupsUseCase,
    private readonly getGroup: GetGroupUseCase,
    private readonly updateGroup: UpdateGroupUseCase,
    private readonly deleteGroup: DeleteGroupUseCase,
    private readonly addMember: AddMemberUseCase,
    private readonly removeMember: RemoveMemberUseCase,
    private readonly addExpense: AddExpenseUseCase,
    private readonly removeExpense: RemoveExpenseUseCase,
    private readonly getSettlement: GetSettlementUseCase,
    private readonly registerPayment: RegisterPaymentUseCase,
    private readonly removePayment: RemovePaymentUseCase,
    private readonly inviteUser: InviteUserUseCase,
    private readonly listGroupInvites: ListGroupInvitesUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreateGroupDto, @CurrentUser() actor: Actor) {
    return this.createGroup.execute({ actor, name: dto.name });
  }

  @Get()
  list(@CurrentUser() actor: Actor) {
    return this.listGroups.execute({ actor });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.getGroup.execute({ actor, groupId: id });
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() actor: Actor, @Body() dto: UpdateGroupDto) {
    return this.updateGroup.execute({ actor, groupId: id, name: dto.name });
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() actor: Actor): Promise<void> {
    await this.deleteGroup.execute({ actor, groupId: id });
  }

  @Post(':id/members')
  postMember(@Param('id') id: string, @CurrentUser() actor: Actor, @Body() dto: AddMemberDto) {
    return this.addMember.execute({
      actor,
      groupId: id,
      personId: dto.personId,
      name: dto.name,
      pixKey: dto.pixKey,
    });
  }

  @Delete(':id/members/:memberId')
  deleteMember(@Param('id') id: string, @CurrentUser() actor: Actor, @Param('memberId') memberId: string) {
    return this.removeMember.execute({ actor, groupId: id, memberId });
  }

  @Post(':id/expenses')
  postExpense(@Param('id') id: string, @CurrentUser() actor: Actor, @Body() dto: AddExpenseDto) {
    return this.addExpense.execute({
      actor,
      groupId: id,
      description: dto.description,
      amountCents: dto.amountCents,
      payerId: dto.payerId,
      participants: dto.participants.map((p) => ({ memberId: p.memberId, weight: p.weight })),
    });
  }

  @Delete(':id/expenses/:expenseId')
  deleteExpense(@Param('id') id: string, @CurrentUser() actor: Actor, @Param('expenseId') expenseId: string) {
    return this.removeExpense.execute({ actor, groupId: id, expenseId });
  }

  @Get(':id/settlement')
  settlement(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.getSettlement.execute({ actor, groupId: id });
  }

  @Post(':id/payments')
  postPayment(@Param('id') id: string, @CurrentUser() actor: Actor, @Body() dto: RegisterPaymentDto) {
    return this.registerPayment.execute({
      actor,
      groupId: id,
      fromId: dto.fromId,
      toId: dto.toId,
      amountCents: dto.amountCents,
    });
  }

  @Delete(':id/payments/:paymentId')
  deletePayment(@Param('id') id: string, @CurrentUser() actor: Actor, @Param('paymentId') paymentId: string) {
    return this.removePayment.execute({ actor, groupId: id, paymentId });
  }

  @Post(':id/invites')
  postInvite(@Param('id') id: string, @CurrentUser() actor: Actor, @Body() dto: InviteUserDto) {
    return this.inviteUser.execute({
      actor,
      groupId: id,
      userId: dto.userId,
      username: dto.username,
    });
  }

  @Get(':id/invites')
  getInvites(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.listGroupInvites.execute({ actor, groupId: id });
  }
}
