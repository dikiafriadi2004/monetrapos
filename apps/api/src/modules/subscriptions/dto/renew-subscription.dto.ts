import { IsInt, Min, Max, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RenewSubscriptionDto {
  @IsInt()
  @Min(1)
  @Max(12)
  @IsIn([1, 3, 6, 12])
  durationMonths: number;

  @ApiPropertyOptional({ description: 'Plan ID to upgrade/change to (optional, uses current plan if not provided)' })
  @IsOptional()
  @IsString()
  planId?: string;
}
