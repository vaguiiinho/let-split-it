import { Module } from '@nestjs/common';
import { Clock, CLOCK } from '../../shared/domain/clock.port';
import { CreatePersonUseCase } from './application/use-cases/create-person.use-case';
import { DeletePersonUseCase } from './application/use-cases/delete-person.use-case';
import { GetPersonUseCase } from './application/use-cases/get-person.use-case';
import { ListPeopleUseCase } from './application/use-cases/list-people.use-case';
import { UpdatePersonUseCase } from './application/use-cases/update-person.use-case';
import { PERSON_REPOSITORY, PersonRepository } from './domain/person.repository';
import { PrismaPersonRepository } from './infrastructure/prisma-person.repository';
import { PeopleController } from './presentation/people.controller';

const withRepo = <T>(Ctor: new (repo: PersonRepository) => T) => ({
  provide: Ctor,
  useFactory: (repo: PersonRepository) => new Ctor(repo),
  inject: [PERSON_REPOSITORY],
});

@Module({
  controllers: [PeopleController],
  providers: [
    { provide: PERSON_REPOSITORY, useClass: PrismaPersonRepository },
    {
      provide: CreatePersonUseCase,
      useFactory: (repo: PersonRepository, clock: Clock) => new CreatePersonUseCase(repo, clock),
      inject: [PERSON_REPOSITORY, CLOCK],
    },
    withRepo(ListPeopleUseCase),
    withRepo(GetPersonUseCase),
    withRepo(UpdatePersonUseCase),
    withRepo(DeletePersonUseCase),
  ],
  exports: [PERSON_REPOSITORY],
})
export class PeopleModule {}
