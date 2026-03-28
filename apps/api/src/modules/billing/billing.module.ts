import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Invoice } from './invoice.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import { Company } from '../companies/company.entity';
import { Subscription } from '../subscriptions/subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      PaymentTransaction,
      Company,
      Subscription,
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
