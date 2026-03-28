import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID()
  planId: string;

  @IsOptional()
  @IsString()
  paymentMethodCode?: string;
}
