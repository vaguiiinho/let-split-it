import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { GroupUseCases } from '../application/group-use-cases';
import { AddExpenseDto } from './dto/add-expense.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateGroupDto } from './dto/create-group.dto';

@Controller('groups')
export class GroupsController {
  constructor(@Inject(GroupUseCases) private readonly groups: GroupUseCases) {}

  @Post()
  create(@Body() dto: CreateGroupDto) {
    return this.groups.createGroup(dto.name);
  }

  @Get()
  list() {
    return this.groups.listGroups();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.groups.getGroup(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.groups.deleteGroup(id);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.groups.addMember(id, { name: dto.name, pixKey: dto.pixKey ?? null });
  }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.groups.removeMember(id, memberId);
  }

  @Post(':id/expenses')
  addExpense(@Param('id') id: string, @Body() dto: AddExpenseDto) {
    return this.groups.addExpense(id, {
      description: dto.description,
      amountCents: dto.amountCents,
      payerId: dto.payerId,
      participants: dto.participants.map((p) => ({ memberId: p.memberId, weight: p.weight })),
    });
  }

  @Delete(':id/expenses/:expenseId')
  removeExpense(@Param('id') id: string, @Param('expenseId') expenseId: string) {
    return this.groups.removeExpense(id, expenseId);
  }

  @Get(':id/settlement')
  settlement(@Param('id') id: string) {
    return this.groups.getSettlement(id);
  }
}
