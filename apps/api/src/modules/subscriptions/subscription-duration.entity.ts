import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { SubscriptionPlan } from './subscription-plan.entity';

@Entity('subscription_durations')
export class SubscriptionDuration extends BaseEntity {
  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.durations)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ type: 'int', name: 'duration_months' })
  durationMonths: number; // 1, 3, 6, 12

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'discount_percentage',
    default: 0,
  })
  discountPercentage: number; // 0, 5, 10, 20

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'final_price' })
  finalPrice: number;
}
