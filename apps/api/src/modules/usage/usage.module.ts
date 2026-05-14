import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageTracking } from './usage-tracking.entity';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { Company } from '../companies/company.entity';
import { SubscriptionPlan } from '../subscriptions/subscription-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageTracking, Company, SubscriptionPlan]),
  ],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
