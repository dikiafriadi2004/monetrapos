import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.subscriptions)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  // Status
  @Column({ type: 'enum', enum: SubscriptionStatus })
  status: SubscriptionStatus;

  // Billing Cycle
  @Column({ type: 'enum', enum: BillingCycle, name: 'billing_cycle' })
  billingCycle: BillingCycle;

  // Periods
  @Column({ type: 'timestamp', nullable: true, name: 'current_period_start' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'current_period_end' })
  currentPeriodEnd: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'trial_start' })
  trialStart: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'trial_end' })
  trialEnd: Date;

  // Cancellation
  @Column({ default: false, name: 'cancel_at_period_end' })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true, name: 'cancellation_reason' })
  cancellationReason: string;

  // Pricing (snapshot at subscription time)
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ length: 3, default: 'IDR' })
  currency: string;

  // Metadata
  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;
}
