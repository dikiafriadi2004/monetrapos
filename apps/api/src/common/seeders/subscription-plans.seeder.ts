import { Injectable } from '@nestjs/common';
import { SubscriptionPlansService } from '../../modules/subscriptions/subscription-plans.service';

@Injectable()
export class SubscriptionPlansSeeder {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  /**
   * Seed default subscription plans with duration options
   */
  async seed(): Promise<void> {
    console.log('🌱 Seeding subscription plans...');
    await this.subscriptionPlansService.seedDefaultPlans();
    console.log('✅ Subscription plans seeding completed');
  }
}
