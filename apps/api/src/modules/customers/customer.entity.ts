import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';

@Entity('customers')
export class Customer extends BaseEntity {
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

  // Basic Info
  @Column({ length: 50, unique: true, name: 'customer_number' })
  customerNumber: string; // Auto-generated: CUST-YYYYMMDD-XXXX

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  // Address
  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 10, nullable: true, name: 'postal_code' })
  postalCode: string;

  // Loyalty
  @Column({ default: 0, name: 'loyalty_points' })
  loyaltyPoints: number;

  @Column({
    type: 'enum',
    enum: ['regular', 'silver', 'gold', 'platinum'],
    default: 'regular',
    name: 'loyalty_tier',
  })
  loyaltyTier: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'total_spent',
  })
  totalSpent: number;

  @Column({ default: 0, name: 'total_orders' })
  totalOrders: number;

  @Column({ type: 'date', nullable: true, name: 'date_of_birth' })
  dateOfBirth: Date;

  @Column({
    type: 'enum',
    enum: ['male', 'female', 'other'],
    nullable: true,
  })
  gender: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Dates
  @Column({ type: 'timestamp', nullable: true, name: 'first_purchase_at' })
  firstPurchaseAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_purchase_at' })
  lastPurchaseAt: Date;

  // Status
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Metadata
  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;

  // Soft Delete
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
