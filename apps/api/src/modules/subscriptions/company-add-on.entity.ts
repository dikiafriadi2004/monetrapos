import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { AddOn } from './add-on.entity';

export enum CompanyAddOnStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('company_add_ons')
export class CompanyAddOn extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'add_on_id' })
  addOnId: string;

  @ManyToOne(() => AddOn, (addOn) => addOn.companyAddOns)
  @JoinColumn({ name: 'add_on_id' })
  addOn: AddOn;

  @Column({ type: 'enum', enum: CompanyAddOnStatus })
  status: CompanyAddOnStatus;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate: Date;

  @Column({ default: true, name: 'is_auto_renew' })
  isAutoRenew: boolean;

  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;
}
