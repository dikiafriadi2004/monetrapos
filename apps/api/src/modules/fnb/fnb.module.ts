import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from './table.entity';
import { FnbOrder } from './fnb-order.entity';
import { FnbModifierGroup, FnbModifierOption } from './fnb-modifier.entity';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { FnbOrdersService } from './fnb-orders.service';
import { FnbOrdersController } from './fnb-orders.controller';
import { FnbModifiersService } from './fnb-modifiers.service';
import { FnbModifiersController } from './fnb-modifiers.controller';
import { SplitBillService } from './split-bill.service';
import { SplitBillController } from './split-bill.controller';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionItem } from '../transactions/transaction-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Table, FnbOrder, FnbModifierGroup, FnbModifierOption, Transaction, TransactionItem])],
  controllers: [TablesController, FnbOrdersController, FnbModifiersController, SplitBillController],
  providers: [TablesService, FnbOrdersService, FnbModifiersService, SplitBillService],
  exports: [TablesService, FnbOrdersService, FnbModifiersService, SplitBillService],
})
export class FnbModule {}
