import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';
import { Employee } from '../employees/employee.entity';
import { Customer } from '../customers/customer.entity';
import { Shift } from '../shifts/shift.entity';
import { TransactionItem } from './transaction-item.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  VOIDED = 'voided',
  REFUNDED = 'refunded',
}

export enum PaymentMethodType {
  CASH = 'cash',
  QRIS = 'qris',
  EDC = 'edc',
  BANK_TRANSFER = 'bank_transfer',
  E_WALLET = 'e_wallet',
}

@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.transactions)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ nullable: true, name: 'shift_id' })
  shiftId: string;

  @ManyToOne(() => Shift, { nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @Column({ nullable: true, name: 'employee_id' })
  employeeId: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ nullable: true, name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // Invoice
  @Column({ unique: true, length: 50, name: 'invoice_number' })
  invoiceNumber: string;

  // Amounts
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'tax_amount' })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'discount_amount' })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'service_charge' })
  serviceCharge: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  // Payment
  @Column({ type: 'enum', enum: PaymentMethodType, name: 'payment_method' })
  paymentMethod: PaymentMethodType;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'paid_amount' })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'change_amount' })
  changeAmount: number;

  // Customer Info (denormalized)
  @Column({ length: 150, nullable: true, name: 'customer_name' })
  customerName: string;

  @Column({ length: 20, nullable: true, name: 'customer_phone' })
  customerPhone: string;

  // Status
  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.COMPLETED })
  status: TransactionStatus;

  // Void/Refund
  @Column({ type: 'timestamp', nullable: true, name: 'voided_at' })
  voidedAt: Date;

  @Column({ nullable: true, name: 'voided_by' })
  voidedBy: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'voided_by' })
  voidedByEmployee: Employee;

  @Column({ type: 'text', nullable: true, name: 'void_reason' })
  voidReason: string;

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Metadata
  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;

  // Relations
  @OneToMany(() => TransactionItem, (item) => item.transaction, { cascade: true })
  items: TransactionItem[];
}
