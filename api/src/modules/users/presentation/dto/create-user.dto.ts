import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'username deve ser texto' })
  username!: string;

  @IsString({ message: 'password deve ser texto' })
  password!: string;

  @IsOptional()
  @IsString({ message: 'name deve ser texto' })
  name?: string;

  @IsOptional()
  @IsIn(['USER', 'ADMIN'], { message: 'role deve ser USER ou ADMIN' })
  role?: 'USER' | 'ADMIN';
}
