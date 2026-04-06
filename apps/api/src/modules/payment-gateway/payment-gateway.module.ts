import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentGatewayController } from './payment-gateway.controller';
import { PaymentGatewayConfigController } from './payment-gateway-config.controller';
import { PaymentGatewayConfigService } from './payment-gateway-config.service';
import { PaymentGatewayConfig } from './payment-gateway-config.entity';
import { UnifiedPaymentService } from './unified-payment.service';
import { XenditPaymentService } from '../payments/xendit-payment.service';
import { BillingModule } from '../billing/billing.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { StoresModule } from '../stores/stores.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { EmailModule } from '../email/email.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { PaymentWebhook } from '../billing/payment-webhook.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, User, PaymentWebhook, PaymentGatewayConfig]),
    ConfigModule,
    forwardRef(() => BillingModule),
    forwardRef(() => SubscriptionsModule),
    StoresModule,
    NotificationsModule,
    PaymentMethodsModule,
    EmailModule,
    AdminAuthModule,
  ],
  controllers: [PaymentGatewayController, PaymentGatewayConfigController],
  providers: [
    PaymentGatewayConfigService,
    XenditPaymentService,
    PaymentGatewayService,
    UnifiedPaymentService,
  ],
  exports: [
    PaymentGatewayConfigService,
    XenditPaymentService,
    PaymentGatewayService,
    UnifiedPaymentService,
  ],
})
export class PaymentGatewayModule {}
