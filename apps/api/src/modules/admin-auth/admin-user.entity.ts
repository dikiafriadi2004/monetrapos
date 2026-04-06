import { Entity, Column, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
}

@Entity('admin_users')
export class AdminUser extends BaseEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.ADMIN })
  role: AdminRole;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date;

  @Column({ length: 45, nullable: true, name: 'last_login_ip' })
  lastLoginIp: string;

  @Column({ default: false, name: 'two_factor_enabled' })
  twoFactorEnabled: boolean;

  @Column({ length: 255, nullable: true, name: 'two_factor_secret' })
  twoFactorSecret: string;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
