import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Subscription, SubscriptionStatus } from './subscription.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Company } from '../companies/company.entity';

export enum SubscriptionHistoryAction {
  CREATED = 'created',
  ACTIVATED = 'activated',
  RENEWED = 'renewed',
  UPGRADED = 'upgraded',
  DOWNGRADED = 'downgraded',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  REACTIVATED = 'reactivated',
  TRIAL_STARTED = 'trial_started',
  TRIAL_CONVERTED = 'trial_converted',
}

@Entity('subscription_history')
export class SubscriptionHistory extends BaseEntity {
  @Column({ name: 'subscription_id' })
  subscriptionId: string;

  @ManyToOne(() => Subscription)
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ nullable: true, name: 'plan_id' })
  planId: string;

  @ManyToOne(() => SubscriptionPlan, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ type: 'enum', enum: SubscriptionHistoryAction })
  action: SubscriptionHistoryAction;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    nullable: true,
    name: 'old_status',
  })
  oldStatus: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    nullable: true,
    name: 'new_status',
  })
  newStatus: SubscriptionStatus;

  @Column({ type: 'date', nullable: true, name: 'old_end_date' })
  oldEndDate: Date;

  @Column({ type: 'date', nullable: true, name: 'new_end_date' })
  newEndDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;

  @Column({ nullable: true, name: 'performed_by' })
  performedBy: string; // User ID who performed the action
}
