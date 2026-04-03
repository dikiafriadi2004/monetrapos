import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemType } from '../laundry-item.entity';

export class CreateLaundryItemDto {
  @IsString()
  item_type: ItemType;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  color?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  brand?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateLaundryOrderDto {
  @IsString()
  store_id: string;

  @IsString()
  customer_id: string;

  @IsString()
  service_type_id: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  weight_kg?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  pickup_date: string;

  @IsDateString()
  delivery_date: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  pickup_address?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  delivery_address?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLaundryItemDto)
  @IsOptional()
  items?: CreateLaundryItemDto[];
}
