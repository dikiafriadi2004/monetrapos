import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  MaxLength,
  IsUrl,
  IsObject,
} from 'class-validator';
import { AddOnCategory, AddOnPricingType, AddOnStatus } from '../add-on.entity';

export class CreateAddOnDto {
  @IsString()
  @MaxLength(100)
  slug: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  long_description?: string;

  @IsEnum(AddOnCategory)
  category: AddOnCategory;

  @IsEnum(AddOnPricingType)
  pricing_type: AddOnPricingType;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsEnum(AddOnStatus)
  status?: AddOnStatus;

  @IsOptional()
  @IsUrl()
  icon_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  available_for_plans?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
