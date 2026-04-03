import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { PaymentWebhook } from '../billing/payment-webhook.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, User, PaymentWebhook, PaymentGatewayConfig]),
    BillingModule,
    forwardRef(() => SubscriptionsModule),
    StoresModule,
    NotificationsModule,
    PaymentMethodsModule,
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
