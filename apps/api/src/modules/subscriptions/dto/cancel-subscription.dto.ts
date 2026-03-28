import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  immediate?: boolean; // true = cancel now, false = cancel at end of period
}
