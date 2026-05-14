import { PartialType } from '@nestjs/mapped-types';
import { CreateLaundryOrderDto } from './create-laundry-order.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LaundryOrderStatus } from '../laundry-order.entity';

export class UpdateLaundryOrderDto extends PartialType(CreateLaundryOrderDto) {}

export class UpdateLaundryOrderStatusDto {
  @IsEnum(LaundryOrderStatus)
  status: LaundryOrderStatus;

  @IsOptional()
  @IsString()
  payment_method?: string; // required when status = DELIVERED

  @IsOptional()
  @IsString()
  notes?: string;
}
