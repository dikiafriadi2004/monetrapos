import { PartialType } from '@nestjs/mapped-types';
import { CreateLaundryOrderDto } from './create-laundry-order.dto';
import { IsEnum } from 'class-validator';
import { LaundryOrderStatus } from '../laundry-order.entity';

export class UpdateLaundryOrderDto extends PartialType(CreateLaundryOrderDto) {}

export class UpdateLaundryOrderStatusDto {
  @IsEnum(LaundryOrderStatus)
  status: LaundryOrderStatus;
}
