import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GroupUseCases } from './application/group-use-cases';
import {
  CLOCK,
  Clock,
  GROUP_REPOSITORY,
  GroupRepository,
  ID_GENERATOR,
  IdGenerator,
} from './application/ports';
import { PrismaGroupRepository } from './infrastructure/prisma-group.repository';
import { PrismaService } from './infrastructure/prisma.service';
import { GroupsController } from './presentation/groups.controller';

@Module({
  controllers: [GroupsController],
  providers: [
    PrismaService,
    { provide: GROUP_REPOSITORY, useClass: PrismaGroupRepository },
    { provide: ID_GENERATOR, useValue: { next: () => randomUUID() } satisfies IdGenerator },
    { provide: CLOCK, useValue: { now: () => new Date() } satisfies Clock },
    {
      provide: GroupUseCases,
      useFactory: (repo: GroupRepository, ids: IdGenerator, clock: Clock) =>
        new GroupUseCases(repo, ids, clock),
      inject: [GROUP_REPOSITORY, ID_GENERATOR, CLOCK],
    },
  ],
})
export class AppModule {}
