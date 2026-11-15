import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { Actor } from '../../../shared/domain/actor';
import { CurrentUser, Roles } from '../../../shared/presentation/auth.decorators';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case';
import { SearchUsersUseCase } from '../application/use-cases/search-users.use-case';
import { CreateUserDto } from './dto/create-user.dto';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly searchUsers: SearchUsersUseCase,
  ) {}

  @Get('search')
  search(@Query() query: SearchUsersQueryDto, @CurrentUser() actor: Actor) {
    return this.searchUsers.execute({ actor, q: query.q });
  }

  @Roles('ADMIN')
  @Get()
  list() {
    return this.listUsers.execute({});
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.createUser.execute({
      username: dto.username,
      password: dto.password,
      name: dto.name,
      role: dto.role,
    });
  }
}
