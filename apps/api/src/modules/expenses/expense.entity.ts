import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities';

// Kategori biaya operasional
export const EXPENSE_CATEGORIES = [
  'sewa', 'listrik', 'air', 'gaji', 'bahan_baku',
  'peralatan', 'marketing', 'transportasi', 'pajak', 'lainnya',
] as const;

export type ExpenseCategoryType = typeof EXPENSE_CATEGORIES[number];

@Entity('expenses')
@Index('idx_company_date', ['companyId', 'expenseDate'])
export class Expense extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @Column({ length: 100 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date', name: 'expense_date' })
  expenseDate: Date;

  @Column({ length: 100, nullable: true, name: 'reference_number' })
  referenceNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true, name: 'created_by' })
  createdBy: string;

  @Column({ type: 'datetime', nullable: true, name: 'deleted_at' })
  deletedAt: Date;
}
