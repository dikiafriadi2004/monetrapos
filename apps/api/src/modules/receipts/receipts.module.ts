import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { Transaction } from '../transactions/transaction.entity';
import { Store } from '../stores/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Store])],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
