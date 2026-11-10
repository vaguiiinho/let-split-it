import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ParticipantDto {
  @IsString({ message: 'memberId deve ser texto' })
  @MinLength(1, { message: 'memberId é obrigatório' })
  memberId!: string;

  @IsOptional()
  @IsInt({ message: 'weight deve ser inteiro' })
  @Min(1, { message: 'weight deve ser no mínimo 1' })
  @Max(100, { message: 'weight deve ser no máximo 100' })
  weight?: number;
}

export class AddExpenseDto {
  @Transform(trim)
  @IsString({ message: 'description deve ser texto' })
  @MinLength(1, { message: 'description é obrigatória' })
  @MaxLength(80, { message: 'description deve ter no máximo 80 caracteres' })
  description!: string;

  @IsInt({ message: 'amountCents deve ser inteiro (centavos)' })
  @Min(1, { message: 'amountCents deve ser maior que zero' })
  @Max(100_000_000, { message: 'amountCents deve ser no máximo 100000000' })
  amountCents!: number;

  @IsString({ message: 'payerId deve ser texto' })
  @MinLength(1, { message: 'payerId é obrigatório' })
  payerId!: string;

  @IsArray({ message: 'participants deve ser uma lista' })
  @ArrayMinSize(1, { message: 'participants precisa de ao menos 1 pessoa' })
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants!: ParticipantDto[];
}
