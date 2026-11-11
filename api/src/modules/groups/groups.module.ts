import { Module } from '@nestjs/common';
import { Clock, CLOCK } from '../../shared/domain/clock.port';
import { PERSON_REPOSITORY, PersonRepository } from '../people/domain/person.repository';
import { PeopleModule } from '../people/people.module';
import { AddExpenseUseCase } from './application/use-cases/add-expense.use-case';
import { AddMemberUseCase } from './application/use-cases/add-member.use-case';
import { CreateGroupUseCase } from './application/use-cases/create-group.use-case';
import { DeleteGroupUseCase } from './application/use-cases/delete-group.use-case';
import { GetDashboardUseCase } from './application/use-cases/get-dashboard.use-case';
import { GetGroupUseCase } from './application/use-cases/get-group.use-case';
import { GetSettlementUseCase } from './application/use-cases/get-settlement.use-case';
import { ListGroupsUseCase } from './application/use-cases/list-groups.use-case';
import { RegisterPaymentUseCase } from './application/use-cases/register-payment.use-case';
import { RemoveExpenseUseCase } from './application/use-cases/remove-expense.use-case';
import { RemoveMemberUseCase } from './application/use-cases/remove-member.use-case';
import { RemovePaymentUseCase } from './application/use-cases/remove-payment.use-case';
import { UpdateGroupUseCase } from './application/use-cases/update-group.use-case';
import { GROUP_REPOSITORY, GroupRepository } from './domain/group.repository';
import { PrismaGroupRepository } from './infrastructure/prisma-group.repository';
import { DashboardController } from './presentation/dashboard.controller';
import { GroupsController } from './presentation/groups.controller';

const withRepo = <T>(Ctor: new (repo: GroupRepository) => T) => ({
  provide: Ctor,
  useFactory: (repo: GroupRepository) => new Ctor(repo),
  inject: [GROUP_REPOSITORY],
});

const withRepoAndClock = <T>(Ctor: new (repo: GroupRepository, clock: Clock) => T) => ({
  provide: Ctor,
  useFactory: (repo: GroupRepository, clock: Clock) => new Ctor(repo, clock),
  inject: [GROUP_REPOSITORY, CLOCK],
});

const withRepoPeopleAndClock = <T>(
  Ctor: new (repo: GroupRepository, people: PersonRepository, clock: Clock) => T,
) => ({
  provide: Ctor,
  useFactory: (repo: GroupRepository, people: PersonRepository, clock: Clock) =>
    new Ctor(repo, people, clock),
  inject: [GROUP_REPOSITORY, PERSON_REPOSITORY, CLOCK],
});

@Module({
  imports: [PeopleModule],
  controllers: [GroupsController, DashboardController],
  providers: [
    { provide: GROUP_REPOSITORY, useClass: PrismaGroupRepository },
    withRepoAndClock(CreateGroupUseCase),
    withRepo(ListGroupsUseCase),
    withRepo(GetGroupUseCase),
    withRepo(UpdateGroupUseCase),
    withRepo(DeleteGroupUseCase),
    withRepoPeopleAndClock(AddMemberUseCase),
    withRepo(RemoveMemberUseCase),
    withRepoAndClock(AddExpenseUseCase),
    withRepo(RemoveExpenseUseCase),
    withRepo(GetSettlementUseCase),
    withRepoAndClock(RegisterPaymentUseCase),
    withRepo(RemovePaymentUseCase),
    withRepoPeopleAndClock(GetDashboardUseCase),
  ],
})
export class GroupsModule {}
