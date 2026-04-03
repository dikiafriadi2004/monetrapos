import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from './table.entity';
import { FnbOrder } from './fnb-order.entity';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { FnbOrdersService } from './fnb-orders.service';
import { FnbOrdersController } from './fnb-orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Table, FnbOrder])],
  controllers: [TablesController, FnbOrdersController],
  providers: [TablesService, FnbOrdersService],
  exports: [TablesService, FnbOrdersService],
})
export class FnbModule {}
