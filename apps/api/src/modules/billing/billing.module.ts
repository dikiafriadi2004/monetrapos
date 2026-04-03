import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Invoice } from './invoice.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import { Company } from '../companies/company.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      PaymentTransaction,
      Company,
      Subscription,
    ]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [BillingController],
  providers: [BillingService, InvoicePdfService],
  exports: [BillingService],
})
export class BillingModule {}
