import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Discount } from './discount.entity';
import { Customer } from '../customers/customer.entity';
import { Transaction } from '../transactions/transaction.entity';

@Entity('discount_usages')
export class DiscountUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  discount_id: string;

  @ManyToOne(() => Discount)
  @JoinColumn({ name: 'discount_id' })
  discount: Discount;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid' })
  transaction_id: string;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  discount_amount: number;

  @CreateDateColumn()
  used_at: Date;
}
