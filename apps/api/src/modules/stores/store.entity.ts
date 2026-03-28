import { Entity, Column, ManyToOne, OneToMany, JoinColumn, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Product } from '../products/product.entity';
import { Category } from '../products/category.entity';
import { Employee } from '../employees/employee.entity';
import { Role } from '../roles/role.entity';
import { Tax } from '../taxes/tax.entity';
import { Discount } from '../discounts/discount.entity';
import { Transaction } from '../transactions/transaction.entity';
import { PaymentMethod } from '../payments/payment-method.entity';
import { QrisConfig } from '../payments/qris-config.entity';

export enum StoreType {
  RETAIL = 'retail',
  FNB = 'fnb',
  WAREHOUSE = 'warehouse',
  SERVICE = 'service',
}

@Entity('stores')
export class Store extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // Basic Info
  @Column({ length: 200 })
  name: string;

  @Column({ length: 50, nullable: true })
  code: string; // Store code for internal reference

  // Type
  @Column({ type: 'enum', enum: StoreType, default: StoreType.RETAIL })
  type: StoreType;

  // Contact
  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  email: string;

  // Address
  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  province: string;

  @Column({ length: 10, nullable: true, name: 'postal_code' })
  postalCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  // Operations
  @Column({ type: 'json', nullable: true, name: 'operational_hours' })
  operationalHours: Record<string, { open: string; close: string }>;

  // Receipt Settings
  @Column({ type: 'text', nullable: true, name: 'receipt_header' })
  receiptHeader: string;

  @Column({ type: 'text', nullable: true, name: 'receipt_footer' })
  receiptFooter: string;

  @Column({ length: 500, nullable: true, name: 'receipt_logo_url' })
  receiptLogoUrl: string;

  // Status
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Relations
  @OneToMany(() => Product, (product) => product.store)
  products: Product[];

  @OneToMany(() => Category, (category) => category.store)
  categories: Category[];

  @OneToMany(() => Employee, (employee) => employee.store)
  employees: Employee[];

  @OneToMany(() => Role, (role) => role.store)
  roles: Role[];

  @OneToMany(() => Tax, (tax) => tax.store)
  taxes: Tax[];

  @OneToMany(() => Discount, (discount) => discount.store)
  discounts: Discount[];

  @OneToMany(() => Transaction, (tx) => tx.store)
  transactions: Transaction[];

  @OneToMany(() => PaymentMethod, (pm) => pm.store)
  paymentMethods: PaymentMethod[];

  @OneToMany(() => QrisConfig, (qris) => qris.store)
  qrisConfigs: QrisConfig[];

  // Soft Delete
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
