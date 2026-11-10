import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class RegisterPaymentDto {
  @IsString({ message: 'fromId deve ser texto' })
  @MinLength(1, { message: 'fromId é obrigatório' })
  fromId!: string;

  @IsString({ message: 'toId deve ser texto' })
  @MinLength(1, { message: 'toId é obrigatório' })
  toId!: string;

  @IsInt({ message: 'amountCents deve ser inteiro (centavos)' })
  @Min(1, { message: 'amountCents deve ser maior que zero' })
  @Max(100_000_000, { message: 'amountCents deve ser no máximo 100000000' })
  amountCents!: number;
}
