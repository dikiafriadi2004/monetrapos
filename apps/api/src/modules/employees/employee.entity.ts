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
import { User } from '../users/user.entity';

@Entity('employees')
export class Employee extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @ManyToOne(() => Store, (store) => store.employees, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  // Basic Info
  @Column({ length: 150 })
  name: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  // Auth (for employees without user accounts)
  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ length: 6, nullable: true })
  pin: string; // Quick PIN for POS login

  // Employment
  @Column({ length: 50, unique: true, name: 'employee_number' })
  employeeNumber: string;

  @Column({ length: 100, nullable: true })
  position: string; // cashier, cook, waiter, manager

  @Column({ type: 'date', name: 'hire_date' })
  hireDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  salary: number;

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
