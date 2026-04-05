#!/usr/bin/env ts-node
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { SubscriptionPlan } from '../modules/subscriptions/subscription-plan.entity';
import { Subscription } from '../modules/subscriptions/subscription.entity';
import { SubscriptionDuration } from '../modules/subscriptions/subscription-duration.entity';
import { Company } from '../modules/companies/company.entity';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'monetrapos',
  entities: [SubscriptionPlan, Subscription, SubscriptionDuration, Company],
  synchronize: false,
  logging: false,
});

const PLANS = [
  {
    name: 'Basic',
    slug: 'basic',
    description: 'Paket dasar untuk usaha kecil',
    priceMonthly: 99000,
    priceYearly: 950000, // ~20% discount
    setupFee: 0,
    trialDays: 14,
    maxStores: 1,
    maxUsers: 2,
    maxEmployees: 5,
    maxProducts: 100,
    maxTransactionsPerMonth: 500,
    maxCustomers: 200,
    maxStorageMb: 500,
    features: {
      pos: true,
      inventory: true,
      reports: true,
      multiStore: false,
      api: false,
      customReceipt: false,
      loyaltyProgram: false,
    },
    isActive: true,
    isPopular: false,
    sortOrder: 1,
  },
  {
    name: 'Professional',
    slug: 'professional',
    description: 'Paket lengkap untuk usaha menengah',
    priceMonthly: 199000,
    priceYearly: 1900000, // ~20% discount
    setupFee: 0,
    trialDays: 14,
    maxStores: 3,
    maxUsers: 5,
    maxEmployees: 20,
    maxProducts: 1000,
    maxTransactionsPerMonth: 5000,
    maxCustomers: 1000,
    maxStorageMb: 2000,
    features: {
      pos: true,
      inventory: true,
      reports: true,
      multiStore: true,
      api: true,
      customReceipt: true,
      loyaltyProgram: true,
    },
    isActive: true,
    isPopular: true,
    sortOrder: 2,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Paket unlimited untuk bisnis besar',
    priceMonthly: 499000,
    priceYearly: 4800000, // ~20% discount
    setupFee: 0,
    trialDays: 14,
    maxStores: -1, // unlimited
    maxUsers: -1, // unlimited
    maxEmployees: -1, // unlimited
    maxProducts: -1, // unlimited
    maxTransactionsPerMonth: -1, // unlimited
    maxCustomers: -1, // unlimited
    maxStorageMb: -1, // unlimited
    features: {
      pos: true,
      inventory: true,
      reports: true,
      multiStore: true,
      api: true,
      customReceipt: true,
      loyaltyProgram: true,
      prioritySupport: true,
      whiteLabel: true,
    },
    isActive: true,
    isPopular: false,
    sortOrder: 3,
  },
];

async function seed() {
  console.log('🌱 Seeding subscription plans...');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const planRepo = AppDataSource.getRepository(SubscriptionPlan);

    // Check if plans already exist
    const existingCount = await planRepo.count();
    if (existingCount > 0) {
      console.log(
        `⚠️  Plans already exist (${existingCount} found). Skipping...`,
      );
      await AppDataSource.destroy();
      return;
    }

    // Create plans
    for (const planData of PLANS) {
      const plan = planRepo.create(planData);
      await planRepo.save(plan);
      console.log(
        `✅ Created: ${plan.name} - Monthly: Rp ${plan.priceMonthly.toLocaleString()}, Yearly: Rp ${plan.priceYearly.toLocaleString()}`,
      );

      // Seed duration options: 1, 3, 6, 12 months with discounts
      const durationRepo = AppDataSource.getRepository(SubscriptionDuration);
      const durations = [
        { durationMonths: 1, discountPercentage: 0 },
        { durationMonths: 3, discountPercentage: 5 },
        { durationMonths: 6, discountPercentage: 10 },
        { durationMonths: 12, discountPercentage: 20 },
      ];
      for (const d of durations) {
        const finalPrice = plan.priceMonthly * d.durationMonths * (1 - d.discountPercentage / 100);
        const duration = durationRepo.create({
          planId: plan.id,
          durationMonths: d.durationMonths,
          discountPercentage: d.discountPercentage,
          finalPrice: Math.round(finalPrice),
        });
        await durationRepo.save(duration);
      }
      console.log(`  ↳ Seeded 4 duration options`);
    }

    console.log(`✅ Seeded ${PLANS.length} subscription plans`);
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
}

seed();

