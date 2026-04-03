import { IsUUID, IsOptional, IsObject } from 'class-validator';

export class PurchaseAddOnDto {
  @IsUUID()
  add_on_id: string;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}
