import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Invoice } from './invoice.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import { PaymentWebhook } from './payment-webhook.entity';
import { Company } from '../companies/company.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { InvoicePdfService } from './invoice-pdf.service';
import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, PaymentTransaction, PaymentWebhook, Company, Subscription]),
    BullModule.registerQueue({ name: 'notifications' }),
    forwardRef(() => PaymentGatewayModule),
    AdminAuthModule,
  ],
  controllers: [BillingController],
  providers: [BillingService, InvoicePdfService],
  exports: [BillingService],
})
export class BillingModule {}
