import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';
import { Employee } from '../employees/employee.entity';

export enum ShiftStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('shifts')
export class Shift extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'employee_id', nullable: true })
  employeeId: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  // User ID (for non-employee users like owners)
  @Column({ name: 'user_id', nullable: true })
  userId: string;

  // Shift Times
  @Column({ type: 'timestamp', nullable: true, name: 'opened_at' })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'closed_at' })
  closedAt: Date;

  // Cash Declaration
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'opening_cash' })
  openingCash: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'closing_cash',
  })
  closingCash: number;

  // Cash Breakdown (by denomination)
  @Column({ type: 'json', nullable: true, name: 'opening_cash_breakdown' })
  openingCashBreakdown: Record<string, number>;

  @Column({ type: 'json', nullable: true, name: 'closing_cash_breakdown' })
  closingCashBreakdown: Record<string, number>;

  // Expected vs Actual
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'expected_cash',
  })
  expectedCash: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'cash_difference',
  })
  cashDifference: number;

  // Sales Summary
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'total_sales',
  })
  totalSales: number;

  @Column({ default: 0, name: 'total_transactions' })
  totalTransactions: number;

  // Payment Method Breakdown
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'cash_sales',
  })
  cashSales: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'card_sales',
  })
  cardSales: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'qris_sales',
  })
  qrisSales: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'ewallet_sales',
  })
  ewalletSales: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'bank_transfer_sales',
  })
  bankTransferSales: number;

  // Status
  @Column({ type: 'enum', enum: ShiftStatus, default: ShiftStatus.OPEN })
  status: ShiftStatus;

  // Notes
  @Column({ type: 'text', nullable: true, name: 'opening_notes' })
  openingNotes: string;

  @Column({ type: 'text', nullable: true, name: 'closing_notes' })
  closingNotes: string;
}
