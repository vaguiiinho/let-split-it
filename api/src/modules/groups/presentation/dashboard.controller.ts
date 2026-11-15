import { Controller, Get } from '@nestjs/common';
import type { Actor } from '../../../shared/domain/actor';
import { CurrentUser } from '../../../shared/presentation/auth.decorators';
import { GetDashboardUseCase } from '../application/use-cases/get-dashboard.use-case';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getDashboard: GetDashboardUseCase) {}

  @Get()
  get(@CurrentUser() actor: Actor) {
    return this.getDashboard.execute({ actor });
  }
}
