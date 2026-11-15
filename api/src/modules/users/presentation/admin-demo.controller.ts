import { Controller, HttpCode, Post } from '@nestjs/common';
import { Roles } from '../../../shared/presentation/auth.decorators';
import { PurgeDemoDataUseCase } from '../application/use-cases/purge-demo-data.use-case';

@Controller('admin/demo')
export class AdminDemoController {
  constructor(private readonly purgeDemoData: PurgeDemoDataUseCase) {}

  @Roles('ADMIN')
  @Post('purge')
  @HttpCode(200)
  purge() {
    return this.purgeDemoData.execute({});
  }
}
