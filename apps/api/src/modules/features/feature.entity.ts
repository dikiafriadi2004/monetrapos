import { Entity, Column, ManyToOne, ManyToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { SubscriptionPlan } from '../subscriptions/subscription-plan.entity';

@Entity('features')
export class Feature extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 100 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.features)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToMany(() => SubscriptionPlan, (plan) => plan.features)
  plans: SubscriptionPlan[];
}
