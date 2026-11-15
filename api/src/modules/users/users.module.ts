import { Module } from '@nestjs/common';
import { Clock, CLOCK } from '../../shared/domain/clock.port';
import { PERSON_REPOSITORY, PersonRepository } from '../people/domain/person.repository';
import { PeopleModule } from '../people/people.module';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { PurgeDemoDataUseCase } from './application/use-cases/purge-demo-data.use-case';
import { SearchUsersUseCase } from './application/use-cases/search-users.use-case';
import { DEMO_DATA_PURGER, DemoDataPurger } from './domain/demo-data-purger.port';
import { PASSWORD_HASHER, PasswordHasher } from './domain/password-hasher.port';
import { USER_REPOSITORY, UserRepository } from './domain/user.repository';
import { DemoPurgeScheduler, parsePurgeIntervalHours } from './infrastructure/demo-purge.scheduler';
import { PrismaDemoDataPurger } from './infrastructure/prisma-demo-data-purger';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher';
import { AdminDemoController } from './presentation/admin-demo.controller';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [PeopleModule],
  controllers: [UsersController, AdminDemoController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: ScryptPasswordHasher },
    { provide: DEMO_DATA_PURGER, useClass: PrismaDemoDataPurger },
    {
      provide: CreateUserUseCase,
      useFactory: (
        users: UserRepository,
        people: PersonRepository,
        hasher: PasswordHasher,
        clock: Clock,
      ) => new CreateUserUseCase(users, people, hasher, clock),
      inject: [USER_REPOSITORY, PERSON_REPOSITORY, PASSWORD_HASHER, CLOCK],
    },
    {
      provide: ListUsersUseCase,
      useFactory: (users: UserRepository) => new ListUsersUseCase(users),
      inject: [USER_REPOSITORY],
    },
    {
      provide: SearchUsersUseCase,
      useFactory: (users: UserRepository) => new SearchUsersUseCase(users),
      inject: [USER_REPOSITORY],
    },
    {
      provide: PurgeDemoDataUseCase,
      useFactory: (purger: DemoDataPurger) => new PurgeDemoDataUseCase(purger),
      inject: [DEMO_DATA_PURGER],
    },
    {
      provide: DemoPurgeScheduler,
      useFactory: (purge: PurgeDemoDataUseCase) =>
        new DemoPurgeScheduler(purge, parsePurgeIntervalHours(process.env.DEMO_PURGE_INTERVAL_HOURS)),
      inject: [PurgeDemoDataUseCase],
    },
  ],
  exports: [USER_REPOSITORY, PASSWORD_HASHER, CreateUserUseCase, PurgeDemoDataUseCase],
})
export class UsersModule {}
