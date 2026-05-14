import { IsString, IsEnum, IsOptional, IsNumber, Min, MaxLength, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType } from '../fnb-order.entity';

export class FnbOrderItemDto {
  @IsString()
  product_id: string;

  @IsString()
  product_name: string;

  @IsNumber()
  @Min(0)
  unit_price: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  variant_id?: string;

  @IsString()
  @IsOptional()
  variant_name?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateFnbOrderDto {
  @IsEnum(OrderType)
  order_type: OrderType;

  @IsString()
  store_id: string;

  @IsString()
  @IsOptional()
  table_id?: string;

  @IsString()
  @IsOptional()
  customer_id?: string;

  @IsString()
  @IsOptional()
  transaction_id?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  delivery_address?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  delivery_fee?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FnbOrderItemDto)
  @IsOptional()
  items?: FnbOrderItemDto[];
}
