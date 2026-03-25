import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { SubscriptionStatus } from '../../common/enums';
import { Member } from '../members/member.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Column({ type: 'datetime' })
  startDate: Date;

  @Column({ type: 'datetime' })
  endDate: Date;

  @Column({ name: 'member_id' })
  memberId: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => Member, (member) => member.subscriptions)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.subscriptions)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;
}
