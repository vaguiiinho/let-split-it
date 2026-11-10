import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class AddMemberDto {
  @Transform(trim)
  @IsString({ message: 'name deve ser texto' })
  @MinLength(1, { message: 'name é obrigatório' })
  @MaxLength(40, { message: 'name deve ter no máximo 40 caracteres' })
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'pixKey deve ser texto' })
  @MaxLength(77, { message: 'pixKey deve ter no máximo 77 caracteres' })
  pixKey?: string | null;
}
