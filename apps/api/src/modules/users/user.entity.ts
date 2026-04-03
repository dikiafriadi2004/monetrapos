import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities';
import { Company } from '../companies/company.entity';

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  ACCOUNTANT = 'accountant',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // Basic Info
  @Column({ length: 150 })
  name: string;

  @Column({ length: 100 })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  // Auth
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ default: false, name: 'email_verified' })
  emailVerified: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'email_verified_at' })
  emailVerifiedAt: Date;

  // Role
  @Column({ type: 'enum', enum: UserRole, default: UserRole.ADMIN })
  role: UserRole;

  @Column({ type: 'json', default: '[]' })
  permissions: string[];

  // Profile
  @Column({ length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  // Status
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date;

  @Column({ length: 45, nullable: true, name: 'last_login_ip' })
  lastLoginIp: string;

  // Security
  @Column({ default: false, name: 'two_factor_enabled' })
  twoFactorEnabled: boolean;

  @Column({ length: 255, nullable: true, name: 'two_factor_secret' })
  twoFactorSecret: string;

  // Soft Delete
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
