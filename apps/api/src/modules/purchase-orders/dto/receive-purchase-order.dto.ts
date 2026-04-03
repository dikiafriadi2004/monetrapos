import { IsArray, ValidateNested, IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivePurchaseOrderItemDto {
  @IsUUID()
  item_id: string;

  @IsNumber()
  @Min(0)
  quantity_received: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items: ReceivePurchaseOrderItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
