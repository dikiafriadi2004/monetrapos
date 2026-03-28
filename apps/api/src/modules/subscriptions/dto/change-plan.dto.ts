import { IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class ChangePlanDto {
  @IsUUID()
  newPlanId: string;

  @IsOptional()
  @IsBoolean()
  immediate?: boolean; // true = change now, false = change at end of period
}
