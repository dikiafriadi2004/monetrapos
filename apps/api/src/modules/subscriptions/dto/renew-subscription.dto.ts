import { IsInt, Min, Max, IsIn } from 'class-validator';

export class RenewSubscriptionDto {
  @IsInt()
  @Min(1)
  @Max(12)
  @IsIn([1, 3, 6, 12])
  durationMonths: number;
}
