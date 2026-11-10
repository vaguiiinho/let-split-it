import { Module } from '@nestjs/common';
import { GroupsModule } from './modules/groups/groups.module';

@Module({ imports: [GroupsModule] })
export class AppModule {}
