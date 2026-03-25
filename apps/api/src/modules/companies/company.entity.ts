import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Member } from '../members/member.entity';
import { Feature } from '../features/feature.entity';
import { SubscriptionPlan } from '../subscriptions/subscription-plan.entity';

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column()
  password: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Member, (member) => member.company)
  members: Member[];

  @OneToMany(() => Feature, (feature) => feature.company)
  features: Feature[];

  @OneToMany(() => SubscriptionPlan, (plan) => plan.company)
  subscriptionPlans: SubscriptionPlan[];
}
