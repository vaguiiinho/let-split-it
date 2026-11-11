import { Module } from '@nestjs/common';
import { GroupsModule } from './modules/groups/groups.module';
import { PeopleModule } from './modules/people/people.module';
import { SharedModule } from './shared/infrastructure/shared.module';

@Module({ imports: [SharedModule, PeopleModule, GroupsModule] })
export class AppModule {}
