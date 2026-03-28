import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Subscription } from './subscription.entity';
import { Feature } from '../features/feature.entity';
import { Company } from '../companies/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan, Subscription, Feature, Company])],
  controllers: [SubscriptionsController, SubscriptionPlansController],
  providers: [SubscriptionsService, SubscriptionPlansService],
  exports: [SubscriptionsService, SubscriptionPlansService],
})
export class SubscriptionsModule {}
