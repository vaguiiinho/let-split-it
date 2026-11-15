import { Module } from '@nestjs/common';
import { Clock, CLOCK } from '../../shared/domain/clock.port';
import { PERSON_REPOSITORY, PersonRepository } from '../people/domain/person.repository';
import { PeopleModule } from '../people/people.module';
import { USER_REPOSITORY, UserRepository } from '../users/domain/user.repository';
import { UsersModule } from '../users/users.module';
import { AcceptInviteUseCase } from './application/use-cases/accept-invite.use-case';
import { AddExpenseUseCase } from './application/use-cases/add-expense.use-case';
import { AddMemberUseCase } from './application/use-cases/add-member.use-case';
import { CreateGroupUseCase } from './application/use-cases/create-group.use-case';
import { DeclineInviteUseCase } from './application/use-cases/decline-invite.use-case';
import { DeleteGroupUseCase } from './application/use-cases/delete-group.use-case';
import { GetDashboardUseCase } from './application/use-cases/get-dashboard.use-case';
import { GetGroupUseCase } from './application/use-cases/get-group.use-case';
import { GetSettlementUseCase } from './application/use-cases/get-settlement.use-case';
import { InviteUserUseCase } from './application/use-cases/invite-user.use-case';
import { ListGroupInvitesUseCase } from './application/use-cases/list-group-invites.use-case';
import { ListGroupsUseCase } from './application/use-cases/list-groups.use-case';
import { ListMyInvitesUseCase } from './application/use-cases/list-my-invites.use-case';
import { RegisterPaymentUseCase } from './application/use-cases/register-payment.use-case';
import { RemoveExpenseUseCase } from './application/use-cases/remove-expense.use-case';
import { RemoveMemberUseCase } from './application/use-cases/remove-member.use-case';
import { RemovePaymentUseCase } from './application/use-cases/remove-payment.use-case';
import { UpdateGroupUseCase } from './application/use-cases/update-group.use-case';
import {
  GROUP_INVITE_REPOSITORY,
  GroupInviteRepository,
} from './domain/group-invite.repository';
import { GROUP_REPOSITORY, GroupRepository } from './domain/group.repository';
import { PrismaGroupInviteRepository } from './infrastructure/prisma-group-invite.repository';
import { PrismaGroupRepository } from './infrastructure/prisma-group.repository';
import { DashboardController } from './presentation/dashboard.controller';
import { GroupsController } from './presentation/groups.controller';
import { InvitesController } from './presentation/invites.controller';

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
  imports: [PeopleModule, UsersModule],
  controllers: [GroupsController, DashboardController, InvitesController],
  providers: [
    { provide: GROUP_REPOSITORY, useClass: PrismaGroupRepository },
    { provide: GROUP_INVITE_REPOSITORY, useClass: PrismaGroupInviteRepository },
    withRepoPeopleAndClock(CreateGroupUseCase),
    withRepo(ListGroupsUseCase),
    withRepo(GetGroupUseCase),
    withRepo(UpdateGroupUseCase),
    withRepo(DeleteGroupUseCase),
    {
      provide: AddMemberUseCase,
      useFactory: (
        repo: GroupRepository,
        people: PersonRepository,
        users: UserRepository,
        clock: Clock,
      ) => new AddMemberUseCase(repo, people, users, clock),
      inject: [GROUP_REPOSITORY, PERSON_REPOSITORY, USER_REPOSITORY, CLOCK],
    },
    withRepo(RemoveMemberUseCase),
    withRepoAndClock(AddExpenseUseCase),
    withRepo(RemoveExpenseUseCase),
    withRepo(GetSettlementUseCase),
    withRepoAndClock(RegisterPaymentUseCase),
    withRepo(RemovePaymentUseCase),
    withRepoPeopleAndClock(GetDashboardUseCase),
    {
      provide: InviteUserUseCase,
      useFactory: (
        groups: GroupRepository,
        invites: GroupInviteRepository,
        users: UserRepository,
        clock: Clock,
      ) => new InviteUserUseCase(groups, invites, users, clock),
      inject: [GROUP_REPOSITORY, GROUP_INVITE_REPOSITORY, USER_REPOSITORY, CLOCK],
    },
    {
      provide: ListGroupInvitesUseCase,
      useFactory: (groups: GroupRepository, invites: GroupInviteRepository) =>
        new ListGroupInvitesUseCase(groups, invites),
      inject: [GROUP_REPOSITORY, GROUP_INVITE_REPOSITORY],
    },
    {
      provide: ListMyInvitesUseCase,
      useFactory: (invites: GroupInviteRepository) => new ListMyInvitesUseCase(invites),
      inject: [GROUP_INVITE_REPOSITORY],
    },
    {
      provide: AcceptInviteUseCase,
      useFactory: (
        groups: GroupRepository,
        invites: GroupInviteRepository,
        people: PersonRepository,
        clock: Clock,
      ) => new AcceptInviteUseCase(groups, invites, people, clock),
      inject: [GROUP_REPOSITORY, GROUP_INVITE_REPOSITORY, PERSON_REPOSITORY, CLOCK],
    },
    {
      provide: DeclineInviteUseCase,
      useFactory: (invites: GroupInviteRepository, clock: Clock) =>
        new DeclineInviteUseCase(invites, clock),
      inject: [GROUP_INVITE_REPOSITORY, CLOCK],
    },
  ],
  exports: [GROUP_INVITE_REPOSITORY],
})
export class GroupsModule {}
