import {
  IsString,
  IsUUID,
  IsDate,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStockOpnameItemDto {
  @IsUUID()
  product_id: string;

  @IsString()
  product_name: string;

  @IsString()
  @IsOptional()
  product_sku?: string;

  @IsNumber()
  @Min(0)
  system_quantity: number;

  @IsNumber()
  @Min(0)
  physical_quantity: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateStockOpnameDto {
  @IsUUID()
  store_id: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  opname_date?: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockOpnameItemDto)
  items: CreateStockOpnameItemDto[];
}
