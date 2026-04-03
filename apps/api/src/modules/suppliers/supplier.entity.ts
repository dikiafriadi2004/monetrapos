import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from '../companies/company.entity';

@Entity('suppliers')
@Index(['company_id'])
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  company_id: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ unique: true, length: 50 })
  supplier_code: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 200, nullable: true })
  contact_person: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column('text', { nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  province: string;

  @Column({ length: 10, nullable: true })
  postal_code: string;

  @Column({ length: 50, nullable: true })
  tax_id: string;

  @Column({ length: 50, nullable: true })
  bank_name: string;

  @Column({ length: 50, nullable: true })
  bank_account_number: string;

  @Column({ length: 200, nullable: true })
  bank_account_name: string;

  @Column({ type: 'int', default: 30 })
  payment_terms_days: number; // Net 30, Net 60, etc.

  @Column('text', { nullable: true })
  notes: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
