import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateGroupDto {
  @Transform(trim)
  @IsString({ message: 'name deve ser texto' })
  @MinLength(1, { message: 'name é obrigatório' })
  @MaxLength(60, { message: 'name deve ter no máximo 60 caracteres' })
  name!: string;
}
