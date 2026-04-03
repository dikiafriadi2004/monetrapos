import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionsCron } from './subscriptions.cron';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Subscription } from './subscription.entity';
import { SubscriptionDuration } from './subscription-duration.entity';
import { SubscriptionHistory } from './subscription-history.entity';
import { Feature } from '../features/feature.entity';
import { Company } from '../companies/company.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillingModule } from '../billing/billing.module';
import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPlan,
      Subscription,
      SubscriptionDuration,
      SubscriptionHistory,
      Feature,
      Company,
    ]),
    NotificationsModule,
    BillingModule,
    forwardRef(() => PaymentGatewayModule),
  ],
  controllers: [SubscriptionsController, SubscriptionPlansController],
  providers: [
    SubscriptionsService,
    SubscriptionPlansService,
    SubscriptionsCron,
  ],
  exports: [SubscriptionsService, SubscriptionPlansService],
})
export class SubscriptionsModule {}
