import { IsString, IsEnum, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';
import { OrderType } from '../fnb-order.entity';

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
}
