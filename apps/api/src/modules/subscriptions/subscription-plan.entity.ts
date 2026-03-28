import { Entity, Column, OneToMany, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Subscription } from './subscription.entity';

@Entity('subscription_plans')
export class SubscriptionPlan extends BaseEntity {
  // Basic Info
  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 50 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Pricing
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'price_monthly' })
  priceMonthly: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'price_yearly' })
  priceYearly: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'setup_fee' })
  setupFee: number;

  // Trial
  @Column({ default: 14, name: 'trial_days' })
  trialDays: number;

  // Features (JSON for flexibility)
  @Column({ type: 'json', default: '{}' })
  features: Record<string, boolean>;

  // Limits
  @Column({ default: 1, name: 'max_stores' })
  maxStores: number;

  @Column({ default: 5, name: 'max_users' })
  maxUsers: number;

  @Column({ default: 10, name: 'max_employees' })
  maxEmployees: number;

  @Column({ default: 100, name: 'max_products' })
  maxProducts: number;

  @Column({ default: 1000, name: 'max_transactions_per_month' })
  maxTransactionsPerMonth: number;

  @Column({ default: 500, name: 'max_customers' })
  maxCustomers: number;

  @Column({ default: 1000, name: 'max_storage_mb' })
  maxStorageMb: number;

  // Metadata
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_popular' })
  isPopular: boolean;

  @Column({ default: 0, name: 'sort_order' })
  sortOrder: number;

  // Relations
  @OneToMany(() => Subscription, (subscription) => subscription.plan)
  subscriptions: Subscription[];

  // Soft Delete
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
