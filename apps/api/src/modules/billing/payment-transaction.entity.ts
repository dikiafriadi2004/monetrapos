import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Invoice } from './invoice.entity';

export enum PaymentTransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
}

export enum PaymentGateway {
  MIDTRANS = 'midtrans',
  XENDIT = 'xendit',
  STRIPE = 'stripe',
}

@Entity('payment_transactions')
export class PaymentTransaction extends BaseEntity {
  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // Gateway Info
  @Column({ type: 'enum', enum: PaymentGateway })
  gateway: PaymentGateway;

  @Column({
    unique: true,
    length: 100,
    nullable: true,
    name: 'gateway_transaction_id',
  })
  gatewayTransactionId: string;

  // Amount
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'IDR' })
  currency: string;

  // Status
  @Column({ type: 'enum', enum: PaymentTransactionStatus })
  status: PaymentTransactionStatus;

  // Payment Details
  @Column({ length: 50, nullable: true, name: 'payment_method' })
  paymentMethod: string;

  @Column({ length: 50, nullable: true, name: 'payment_channel' })
  paymentChannel: string; // gopay, ovo, bca_va, mandiri_va, etc

  // Response Data (for debugging)
  @Column({ type: 'json', nullable: true, name: 'gateway_request' })
  gatewayRequest: Record<string, any>;

  @Column({ type: 'json', nullable: true, name: 'gateway_response' })
  gatewayResponse: Record<string, any>;

  // Timestamps
  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;
}
