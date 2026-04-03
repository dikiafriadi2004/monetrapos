import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Subscription } from '../subscriptions/subscription.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum InvoiceType {
  SUBSCRIPTION = 'subscription',
  ADD_ON = 'add_on',
  RENEWAL = 'renewal',
}

@Entity('invoices')
export class Invoice extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ nullable: true, name: 'subscription_id' })
  subscriptionId: string;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  // Invoice Info
  @Column({ unique: true, length: 50, name: 'invoice_number' })
  invoiceNumber: string;

  @Column({
    type: 'enum',
    enum: InvoiceType,
    default: InvoiceType.SUBSCRIPTION,
    name: 'invoice_type',
  })
  invoiceType: InvoiceType;

  @Column({ length: 500, nullable: true, name: 'invoice_pdf_url' })
  invoicePdfUrl: string;

  @Column({ nullable: true, name: 'add_on_id' })
  addOnId: string;

  @Column({ nullable: true, name: 'company_add_on_id' })
  companyAddOnId: string;

  // Amounts
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    name: 'tax_rate',
  })
  taxRate: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'tax_amount',
  })
  taxAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'discount_amount',
  })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ length: 3, default: 'IDR' })
  currency: string;

  // Status
  @Column({ type: 'enum', enum: InvoiceStatus })
  status: InvoiceStatus;

  // Dates
  @Column({ type: 'date', name: 'issue_date' })
  issueDate: Date;

  @Column({ type: 'date', name: 'due_date' })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt: Date;

  // Payment
  @Column({ length: 50, nullable: true, name: 'payment_method' })
  paymentMethod: string; // credit_card, bank_transfer, e_wallet, qris

  @Column({ length: 100, nullable: true, name: 'payment_reference' })
  paymentReference: string;

  @Column({ type: 'text', nullable: true, name: 'payment_url' })
  paymentUrl: string;

  // Line Items (JSON for flexibility)
  @Column({ type: 'json', default: '[]', name: 'line_items' })
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;
}
