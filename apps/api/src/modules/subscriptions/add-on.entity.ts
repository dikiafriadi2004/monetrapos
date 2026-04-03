import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { CompanyAddOn } from './company-add-on.entity';

export enum AddOnCategory {
  INTEGRATION = 'integration',
  FEATURE = 'feature',
  SUPPORT = 'support',
  CAPACITY = 'capacity',
}

@Entity('add_ons')
export class AddOn extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ unique: true, length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: AddOnCategory })
  category: AddOnCategory;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'price_monthly' })
  priceMonthly: number;

  @Column({ default: true, name: 'is_recurring' })
  isRecurring: boolean;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'json', nullable: true, name: 'available_for_plans' })
  availableForPlans: string[] | null; // Array of plan IDs, null = all plans

  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;

  @OneToMany(() => CompanyAddOn, (companyAddOn) => companyAddOn.addOn)
  companyAddOns: CompanyAddOn[];
}
