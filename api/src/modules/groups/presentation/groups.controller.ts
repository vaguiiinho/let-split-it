import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { AddExpenseUseCase } from '../application/use-cases/add-expense.use-case';
import { AddMemberUseCase } from '../application/use-cases/add-member.use-case';
import { CreateGroupUseCase } from '../application/use-cases/create-group.use-case';
import { DeleteGroupUseCase } from '../application/use-cases/delete-group.use-case';
import { GetGroupUseCase } from '../application/use-cases/get-group.use-case';
import { GetSettlementUseCase } from '../application/use-cases/get-settlement.use-case';
import { ListGroupsUseCase } from '../application/use-cases/list-groups.use-case';
import { RegisterPaymentUseCase } from '../application/use-cases/register-payment.use-case';
import { RemoveExpenseUseCase } from '../application/use-cases/remove-expense.use-case';
import { RemoveMemberUseCase } from '../application/use-cases/remove-member.use-case';
import { RemovePaymentUseCase } from '../application/use-cases/remove-payment.use-case';
import { AddExpenseDto } from './dto/add-expense.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly createGroup: CreateGroupUseCase,
    private readonly listGroups: ListGroupsUseCase,
    private readonly getGroup: GetGroupUseCase,
    private readonly deleteGroup: DeleteGroupUseCase,
    private readonly addMember: AddMemberUseCase,
    private readonly removeMember: RemoveMemberUseCase,
    private readonly addExpense: AddExpenseUseCase,
    private readonly removeExpense: RemoveExpenseUseCase,
    private readonly getSettlement: GetSettlementUseCase,
    private readonly registerPayment: RegisterPaymentUseCase,
    private readonly removePayment: RemovePaymentUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreateGroupDto) {
    return this.createGroup.execute({ name: dto.name });
  }

  @Get()
  list() {
    return this.listGroups.execute({});
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getGroup.execute({ groupId: id });
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteGroup.execute({ groupId: id });
  }

  @Post(':id/members')
  postMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.addMember.execute({ groupId: id, name: dto.name, pixKey: dto.pixKey ?? null });
  }

  @Delete(':id/members/:memberId')
  deleteMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.removeMember.execute({ groupId: id, memberId });
  }

  @Post(':id/expenses')
  postExpense(@Param('id') id: string, @Body() dto: AddExpenseDto) {
    return this.addExpense.execute({
      groupId: id,
      description: dto.description,
      amountCents: dto.amountCents,
      payerId: dto.payerId,
      participants: dto.participants.map((p) => ({ memberId: p.memberId, weight: p.weight })),
    });
  }

  @Delete(':id/expenses/:expenseId')
  deleteExpense(@Param('id') id: string, @Param('expenseId') expenseId: string) {
    return this.removeExpense.execute({ groupId: id, expenseId });
  }

  @Get(':id/settlement')
  settlement(@Param('id') id: string) {
    return this.getSettlement.execute({ groupId: id });
  }

  @Post(':id/payments')
  postPayment(@Param('id') id: string, @Body() dto: RegisterPaymentDto) {
    return this.registerPayment.execute({
      groupId: id,
      fromId: dto.fromId,
      toId: dto.toId,
      amountCents: dto.amountCents,
    });
  }

  @Delete(':id/payments/:paymentId')
  deletePayment(@Param('id') id: string, @Param('paymentId') paymentId: string) {
    return this.removePayment.execute({ groupId: id, paymentId });
  }
}
