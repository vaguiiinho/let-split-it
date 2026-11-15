import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { GroupsModule } from './modules/groups/groups.module';
import { PeopleModule } from './modules/people/people.module';
import { UsersModule } from './modules/users/users.module';
import { SharedModule } from './shared/infrastructure/shared.module';

@Module({ imports: [SharedModule, PeopleModule, UsersModule, GroupsModule, AuthModule] })
export class AppModule {}
