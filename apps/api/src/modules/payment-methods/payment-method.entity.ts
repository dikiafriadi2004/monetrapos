import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';

export enum PaymentMethodType {
  CASH = 'cash',
  CARD = 'card',
  EWALLET = 'ewallet',
  BANK_TRANSFER = 'bank_transfer',
  QRIS = 'qris',
  OTHER = 'other',
}

@Entity('payment_methods')
@Index('IDX_payment_methods_company', ['companyId'])
@Index('IDX_payment_methods_active', ['isActive'])
@Index('IDX_payment_methods_type', ['type'])
@Index('UK_payment_methods_company_code', ['companyId', 'code'], {
  unique: true,
})
export class PaymentMethod extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  code: string;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
    default: PaymentMethodType.CASH,
  })
  type: PaymentMethodType;

  @Column({ name: 'icon_url', length: 255, nullable: true })
  iconUrl: string;

  @Column({ length: 20, nullable: true })
  color: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'requires_reference', default: false })
  requiresReference: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'account_code', length: 50, nullable: true })
  accountCode: string;
}
