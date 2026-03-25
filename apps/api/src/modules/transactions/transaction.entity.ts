import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { TransactionStatus, PaymentMethodType } from '../../common/enums';
import { Store } from '../stores/store.entity';
import { TransactionItem } from './transaction-item.entity';

@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ unique: true, length: 50 })
  invoiceNumber: string;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.COMPLETED })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  changeAmount: number;

  @Column({ type: 'enum', enum: PaymentMethodType })
  paymentMethod: PaymentMethodType;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  employeeId: string;

  @Column({ nullable: true })
  employeeName: string;

  @Column({ type: 'text', nullable: true })
  voidReason: string;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.transactions)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @OneToMany(() => TransactionItem, (item) => item.transaction, { cascade: true })
  items: TransactionItem[];
}
