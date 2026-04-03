import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Customer } from './customer.entity';
import { LoyaltyPointTransaction } from './loyalty-point-transaction.entity';
import { Transaction } from '../transactions/transaction.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerLoyaltyService } from './customer-loyalty.service';
import { CustomerLoyaltyController } from './customer-loyalty.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, LoyaltyPointTransaction, Transaction]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [CustomersController, CustomerLoyaltyController],
  providers: [CustomersService, CustomerLoyaltyService],
  exports: [CustomersService, CustomerLoyaltyService],
})
export class CustomersModule {}
