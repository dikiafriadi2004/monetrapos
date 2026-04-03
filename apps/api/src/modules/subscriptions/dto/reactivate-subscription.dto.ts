import { IsInt, Min, Max, IsIn, IsOptional } from 'class-validator';

export class ReactivateSubscriptionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @IsIn([1, 3, 6, 12])
  durationMonths?: number;
}
