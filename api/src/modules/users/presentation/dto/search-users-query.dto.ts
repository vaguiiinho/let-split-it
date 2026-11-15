import { IsString } from 'class-validator';

export class SearchUsersQueryDto {
  @IsString({ message: 'q deve ser texto' })
  q!: string;
}
