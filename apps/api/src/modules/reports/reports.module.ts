import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AdvancedReportsController } from './advanced-reports.controller';
import { AdvancedReportsService } from './advanced-reports.service';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionItem } from '../transactions/transaction-item.entity';
import { Product } from '../products/product.entity';
import { Customer } from '../customers/customer.entity';
import { Employee } from '../employees/employee.entity';
import { Shift } from '../shifts/shift.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionItem,
      Product,
      Customer,
      Employee,
      Shift,
    ]),
  ],
  controllers: [ReportsController, AdvancedReportsController],
  providers: [ReportsService, AdvancedReportsService],
  exports: [ReportsService, AdvancedReportsService],
})
export class ReportsModule {}
