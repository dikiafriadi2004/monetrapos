import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  console.log('🌱 Creating admin subscription...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Get admin company
    const [company] = await dataSource.query(
      `SELECT id FROM companies WHERE email = ? LIMIT 1`,
      ['admin@monetrapos.com']
    );

    if (!company) {
      console.error('❌ Admin company not found');
      process.exit(1);
    }

    console.log(`✓ Found admin company: ${company.id}`);

    // Check if subscription already exists
    const [existingSub] = await dataSource.query(
      `SELECT id FROM subscriptions WHERE company_id = ? LIMIT 1`,
      [company.id]
    );

    if (existingSub) {
      console.log('✓ Admin subscription already exists');
      process.exit(0);
    }

    // Get a subscription plan
    const [plan] = await dataSource.query(
      `SELECT id, name FROM subscription_plans WHERE is_active = 1 ORDER BY price_monthly DESC LIMIT 1`
    );

    if (!plan) {
      console.error('❌ No subscription plan found');
      process.exit(1);
    }

    console.log(`✓ Using plan: ${plan.name} (${plan.id})`);

    // Create subscription
    const subscriptionId = crypto.randomUUID();
    const now = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from now

    await dataSource.query(
      `INSERT INTO subscriptions (
        id, company_id, plan_id, status, 
        start_date, end_date, duration_months,
        billing_cycle, current_period_start, current_period_end,
        price, currency, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subscriptionId,
        company.id,
        plan.id,
        'active',
        now,
        endDate,
        12,
        'yearly',
        now,
        endDate,
        0, // Free for admin
        'IDR',
        now,
        now,
      ]
    );

    console.log(`✓ Created subscription: ${subscriptionId}`);

    // Verify
    const [created] = await dataSource.query(
      `SELECT s.id, s.status, s.start_date, s.end_date, 
              c.name as company_name, sp.name as plan_name
       FROM subscriptions s
       JOIN companies c ON s.company_id = c.id
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.id = ?`,
      [subscriptionId]
    );

    console.log('\n✅ Admin subscription created successfully!');
    console.log('Details:', {
      id: created.id,
      company: created.company_name,
      plan: created.plan_name,
      status: created.status,
      startDate: created.start_date,
      endDate: created.end_date,
    });

  } catch (error) {
    console.error('\n❌ Failed to create admin subscription:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

