import { IsString, IsEnum, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';
import { ServiceType, PricingType } from '../laundry-service-type.entity';

export class CreateLaundryServiceTypeDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(ServiceType)
  service_type: ServiceType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PricingType)
  pricing_type: PricingType;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  estimated_hours?: number;
}
