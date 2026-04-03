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
import { AddOn } from './add-on.entity';

export enum CompanyAddOnStatus {
  ACTIVE = 'active',
  PENDING_PAYMENT = 'pending_payment',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('company_add_ons')
@Index(['company_id', 'add_on_id'])
@Index(['status'])
@Index(['expires_at'])
export class CompanyAddOn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  company_id: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column('uuid')
  add_on_id: string;

  @ManyToOne(() => AddOn)
  @JoinColumn({ name: 'add_on_id' })
  add_on: AddOn;

  @Column({
    type: 'enum',
    enum: CompanyAddOnStatus,
    default: CompanyAddOnStatus.PENDING_PAYMENT,
  })
  status: CompanyAddOnStatus;

  // Purchase details
  @Column('decimal', { precision: 10, scale: 2 })
  purchase_price: number;

  @Column({ nullable: true })
  invoice_id: string;

  @Column({ nullable: true })
  payment_transaction_id: string;

  // Dates
  @Column({ type: 'timestamp', nullable: true })
  activated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date; // For recurring add-ons

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  // Auto-renewal for recurring add-ons
  @Column({ default: true })
  auto_renew: boolean;

  // Configuration specific to this company's add-on instance
  @Column('simple-json', { nullable: true })
  configuration: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
