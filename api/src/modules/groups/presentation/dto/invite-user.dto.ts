import { IsOptional, IsString } from 'class-validator';

export class InviteUserDto {
  @IsOptional()
  @IsString({ message: 'userId deve ser texto' })
  userId?: string;

  @IsOptional()
  @IsString({ message: 'username deve ser texto' })
  username?: string;
}
