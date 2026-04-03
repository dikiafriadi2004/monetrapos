import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Customer } from './customer.entity';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

export enum LoyaltyPointTransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
  ADJUSTMENT = 'adjustment',
  EXPIRE = 'expire',
}

@Entity('loyalty_point_transactions')
export class LoyaltyPointTransaction extends BaseEntity {
  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({
    type: 'enum',
    enum: LoyaltyPointTransactionType,
  })
  type: LoyaltyPointTransactionType;

  @Column({ type: 'int' })
  points: number;

  @Column({ type: 'int', name: 'balance_after' })
  balanceAfter: number;

  @Column({ length: 50, nullable: true, name: 'reference_type' })
  referenceType: string; // 'transaction', 'manual', etc.

  @Column({ nullable: true, name: 'reference_id' })
  referenceId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, name: 'performed_by' })
  performedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by' })
  performedByUser: User;
}
