import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Transaction } from './transaction.entity';

@Entity('transaction_items')
export class TransactionItem extends BaseEntity {
  @Column({ length: 150 })
  productName: string;

  @Column({ length: 100, nullable: true })
  variantName: string;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  productId: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @ManyToOne(() => Transaction, (tx) => tx.items)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;
}
