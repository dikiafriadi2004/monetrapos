import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { DiscountType } from '../../common/enums';
import { Store } from '../stores/store.entity';
import { Company } from '../companies/company.entity';

export enum DiscountScope {
  ALL = 'all',
  CATEGORY = 'category',
  PRODUCT = 'product',
}

@Entity('discounts')
export class Discount extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: DiscountType })
  type: DiscountType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  value: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minTransaction: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscount: number;

  @Column({ length: 50, nullable: true, unique: true })
  promoCode: string;

  @Column({
    type: 'enum',
    enum: DiscountScope,
    default: DiscountScope.ALL,
  })
  scope: DiscountScope;

  @Column({ type: 'simple-array', nullable: true })
  applicableIds: string[];

  @Column({ type: 'int', nullable: true })
  usageLimit: number;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'int', nullable: true })
  usageLimitPerCustomer: number;

  @Column({ type: 'datetime', nullable: true })
  startDate: Date;

  @Column({ type: 'datetime', nullable: true })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.discounts, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store: Store;
}
