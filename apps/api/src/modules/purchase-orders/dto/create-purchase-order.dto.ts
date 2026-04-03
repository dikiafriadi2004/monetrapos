import {
  IsString,
  IsUUID,
  IsDate,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '../purchase-order.entity';

export class CreatePurchaseOrderItemDto {
  @IsUUID()
  product_id: string;

  @IsString()
  product_name: string;

  @IsString()
  @IsOptional()
  product_sku?: string;

  @IsNumber()
  @Min(1)
  quantity_ordered: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  unit_price: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  supplier_id: string;

  @IsUUID()
  store_id: string;

  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  order_date?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expected_delivery_date?: Date;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tax_rate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount_amount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  shipping_cost?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  terms_and_conditions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}
