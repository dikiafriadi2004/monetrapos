import { Entity, Column, ManyToOne, ManyToMany, OneToMany, JoinColumn, JoinTable } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Feature } from '../features/feature.entity';
import { Subscription } from './subscription.entity';

@Entity('subscription_plans')
export class SubscriptionPlan extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ default: 30 })
  durationDays: number;

  @Column({ default: 1 })
  maxOutlets: number;

  @Column({ default: 50 })
  maxProducts: number;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.subscriptionPlans)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToMany(() => Feature, (feature) => feature.plans, { eager: true })
  @JoinTable({
    name: 'plan_features',
    joinColumn: { name: 'plan_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'feature_id', referencedColumnName: 'id' },
  })
  features: Feature[];

  @OneToMany(() => Subscription, (sub) => sub.plan)
  subscriptions: Subscription[];
}
