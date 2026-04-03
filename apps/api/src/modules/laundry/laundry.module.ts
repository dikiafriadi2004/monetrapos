import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LaundryServiceType } from './laundry-service-type.entity';
import { LaundryOrder } from './laundry-order.entity';
import { LaundryItem } from './laundry-item.entity';
import { LaundryServiceTypesService } from './laundry-service-types.service';
import { LaundryServiceTypesController } from './laundry-service-types.controller';
import { LaundryOrdersService } from './laundry-orders.service';
import { LaundryOrdersController } from './laundry-orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LaundryServiceType, LaundryOrder, LaundryItem])],
  controllers: [LaundryServiceTypesController, LaundryOrdersController],
  providers: [LaundryServiceTypesService, LaundryOrdersService],
  exports: [LaundryServiceTypesService, LaundryOrdersService],
})
export class LaundryModule {}
