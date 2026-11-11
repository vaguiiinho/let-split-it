import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdatePersonDto {
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'name deve ser texto' })
  @MaxLength(40, { message: 'name deve ter no máximo 40 caracteres' })
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'pixKey deve ser texto' })
  @MaxLength(77, { message: 'pixKey deve ter no máximo 77 caracteres' })
  pixKey?: string | null;
}
