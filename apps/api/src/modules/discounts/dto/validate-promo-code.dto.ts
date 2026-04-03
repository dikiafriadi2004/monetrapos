import { IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';

export class ValidatePromoCodeDto {
  @IsString()
  promoCode: string;

  @IsNumber()
  @Min(0)
  transactionTotal: number;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  storeId?: string;

  @IsArray()
  @IsOptional()
  categoryIds?: string[];

  @IsArray()
  @IsOptional()
  productIds?: string[];
}

export class GeneratePromoCodeDto {
  @IsString()
  prefix: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  length?: number;
}
