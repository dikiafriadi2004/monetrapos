import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';

export enum UsageMetric {
  STORES = 'stores',
  USERS = 'users',
  EMPLOYEES = 'employees',
  PRODUCTS = 'products',
  TRANSACTIONS = 'transactions',
  CUSTOMERS = 'customers',
  STORAGE = 'storage',
}

@Entity('usage_tracking')
@Unique(['companyId', 'metric', 'periodStart'])
export class UsageTracking extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // Metric
  @Column({ type: 'enum', enum: UsageMetric })
  metric: UsageMetric;

  // Count
  @Column({ default: 0 })
  count: number;

  // Period
  @Column({ type: 'date', name: 'period_start' })
  periodStart: Date;

  @Column({ type: 'date', name: 'period_end' })
  periodEnd: Date;

  // Metadata
  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;
}
