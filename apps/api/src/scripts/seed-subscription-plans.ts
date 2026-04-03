import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SubscriptionPlansService } from '../modules/subscriptions/subscription-plans.service';

async function bootstrap() {
  console.log('🌱 Seeding subscription plans...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const subscriptionPlansService = app.get(SubscriptionPlansService);

  try {
    await subscriptionPlansService.seedDefaultPlans();
    console.log('\n✅ Subscription plans seeded successfully!');
  } catch (error) {
    console.error('\n❌ Failed to seed subscription plans:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
