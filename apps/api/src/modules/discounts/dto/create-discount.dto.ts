import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  Min,
  Max,
  MaxLength,
  IsInt,
} from 'class-validator';
import { DiscountType } from '../../../common/enums';
import { DiscountScope } from '../discount.entity';

export class CreateDiscountDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DiscountType)
  type: DiscountType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minTransaction?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxDiscount?: number;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  promoCode?: string;

  @IsEnum(DiscountScope)
  @IsOptional()
  scope?: DiscountScope;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableIds?: string[];

  @IsInt()
  @Min(1)
  @IsOptional()
  usageLimit?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  usageLimitPerCustomer?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  storeId?: string;
}
