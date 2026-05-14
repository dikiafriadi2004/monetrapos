import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Customer } from './customer.entity';
import { LoyaltyPointTransaction } from './loyalty-point-transaction.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Company } from '../companies/company.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerLoyaltyService } from './customer-loyalty.service';
import { CustomerLoyaltyController } from './customer-loyalty.controller';
import { BirthdayReminderService } from './birthday-reminder.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, LoyaltyPointTransaction, Transaction, Company]),
    BullModule.registerQueue({ name: 'notifications' }),
    EmailModule,
  ],
  controllers: [CustomersController, CustomerLoyaltyController],
  providers: [CustomersService, CustomerLoyaltyService, BirthdayReminderService],
  exports: [CustomersService, CustomerLoyaltyService, BirthdayReminderService],
})
export class CustomersModule {}
