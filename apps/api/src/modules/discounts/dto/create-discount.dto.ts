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
import { Transform } from 'class-transformer';
import { DiscountType } from '../../../common/enums';
import { DiscountScope } from '../discount.entity';

// Map frontend field names → backend field names
// Frontend sends: discountType, minPurchaseAmount, maxDiscountAmount, fixed_amount
// Backend expects: type, minTransaction, maxDiscount, fixed

export class CreateDiscountDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  // Accept both 'type' and 'discountType' from frontend
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsNumber()
  @Min(0)
  value: number;

  // Accept both 'minTransaction' and 'minPurchaseAmount'
  @IsNumber()
  @Min(0)
  @IsOptional()
  minTransaction?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minPurchaseAmount?: number;

  // Accept both 'maxDiscount' and 'maxDiscountAmount'
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxDiscount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxDiscountAmount?: number;

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

  // Accept 0 as "unlimited" (convert to undefined)
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
