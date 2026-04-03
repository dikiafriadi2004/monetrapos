import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from './inventory.entity';
import { StockMovement } from './stock-movement.entity';
import { StockOpname, StockOpnameItem } from './stock-opname.entity';
import { Product } from '../products/product.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { StockOpnameService } from './stock-opname.service';
import { StockOpnameController } from './stock-opname.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventory,
      StockMovement,
      StockOpname,
      StockOpnameItem,
      Product,
    ]),
    NotificationsModule,
  ],
  controllers: [InventoryController, StockOpnameController],
  providers: [InventoryService, StockOpnameService],
  exports: [InventoryService, StockOpnameService],
})
export class InventoryModule {}
