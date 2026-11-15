import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { Actor } from '../../../shared/domain/actor';
import { CurrentUser, Public } from '../../../shared/presentation/auth.decorators';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  doLogin(@Body() dto: LoginDto) {
    return this.login.execute({ username: dto.username, password: dto.password });
  }

  @Get('me')
  me(@CurrentUser() actor: Actor) {
    return this.getCurrentUser.execute({ actor });
  }
}
