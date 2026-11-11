import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateGroupDto {
  @Transform(trim)
  @IsString({ message: 'name deve ser texto' })
  @MinLength(1, { message: 'name é obrigatório' })
  @MaxLength(60, { message: 'name deve ter no máximo 60 caracteres' })
  name!: string;
}
