import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Invoice } from './invoice.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import { PaymentWebhook } from './payment-webhook.entity';
import { Coupon } from './coupon.entity';
import { WebhookLog } from './webhook-log.entity';
import { EmailTemplate } from '../email/email-template.entity';
import { Company } from '../companies/company.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { InvoicePdfService } from './invoice-pdf.service';
import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminBillingController } from './admin-billing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, PaymentTransaction, PaymentWebhook, Coupon, WebhookLog, EmailTemplate, Company, Subscription]),
    BullModule.registerQueue({ name: 'notifications' }),
    forwardRef(() => PaymentGatewayModule),
    AdminAuthModule,
  ],
  controllers: [BillingController, AdminBillingController],
  providers: [BillingService, InvoicePdfService],
  exports: [BillingService],
})
export class BillingModule {}
