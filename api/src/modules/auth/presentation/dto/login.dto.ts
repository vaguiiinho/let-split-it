import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'username deve ser texto' })
  @IsNotEmpty({ message: 'username é obrigatório' })
  @MaxLength(128, { message: 'username deve ter no máximo 128 caracteres' })
  username!: string;

  @IsString({ message: 'password deve ser texto' })
  @IsNotEmpty({ message: 'password é obrigatório' })
  @MaxLength(128, { message: 'password deve ter no máximo 128 caracteres' })
  password!: string;
}
