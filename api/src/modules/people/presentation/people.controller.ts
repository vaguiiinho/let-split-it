import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { Actor } from '../../../shared/domain/actor';
import { CurrentUser } from '../../../shared/presentation/auth.decorators';
import { CreatePersonUseCase } from '../application/use-cases/create-person.use-case';
import { DeletePersonUseCase } from '../application/use-cases/delete-person.use-case';
import { GetPersonUseCase } from '../application/use-cases/get-person.use-case';
import { ListPeopleUseCase } from '../application/use-cases/list-people.use-case';
import { UpdatePersonUseCase } from '../application/use-cases/update-person.use-case';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

@Controller('people')
export class PeopleController {
  constructor(
    private readonly createPerson: CreatePersonUseCase,
    private readonly listPeople: ListPeopleUseCase,
    private readonly getPerson: GetPersonUseCase,
    private readonly updatePerson: UpdatePersonUseCase,
    private readonly deletePerson: DeletePersonUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreatePersonDto, @CurrentUser() actor: Actor) {
    return this.createPerson.execute({ name: dto.name, pixKey: dto.pixKey, actor });
  }

  @Get()
  list(@CurrentUser() actor: Actor) {
    return this.listPeople.execute({ actor });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.getPerson.execute({ personId: id, actor });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePersonDto, @CurrentUser() actor: Actor) {
    return this.updatePerson.execute({ personId: id, name: dto.name, pixKey: dto.pixKey, actor });
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deletePerson.execute({ personId: id });
  }
}
