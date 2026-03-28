import { Entity, Column, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';
import { Store } from '../stores/store.entity';

@Entity('employees')
export class Employee extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.employees)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  // Basic Info
  @Column({ length: 150 })
  name: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  // Auth (separate from users table)
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ length: 6, nullable: true })
  pin: string; // Quick PIN for POS login

  // Employment
  @Column({ length: 50, nullable: true, name: 'employee_code' })
  employeeCode: string;

  @Column({ length: 100, nullable: true })
  position: string; // cashier, cook, waiter, manager

  @Column({ type: 'date', nullable: true, name: 'hire_date' })
  hireDate: Date;

  // Profile
  @Column({ length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  // Status
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Soft Delete
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
