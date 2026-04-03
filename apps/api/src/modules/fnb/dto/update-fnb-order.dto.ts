import { PartialType } from '@nestjs/mapped-types';
import { CreateFnbOrderDto } from './create-fnb-order.dto';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../fnb-order.entity';

export class UpdateFnbOrderDto extends PartialType(CreateFnbOrderDto) {}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
