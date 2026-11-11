import { Controller, Get } from '@nestjs/common';
import { GetDashboardUseCase } from '../application/use-cases/get-dashboard.use-case';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getDashboard: GetDashboardUseCase) {}

  @Get()
  get() {
    return this.getDashboard.execute({});
  }
}
