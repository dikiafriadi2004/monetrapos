import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

// Default permissions per role
const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'pos.create_transaction', 'pos.void_transaction', 'pos.refund', 'pos.apply_discount', 'pos.view_cart',
    'product.view', 'product.create', 'product.edit', 'product.delete', 'product.manage_stock',
    'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.opname',
    'employee.view', 'employee.create', 'employee.edit', 'employee.delete', 'employee.manage_role', 'employee.manage_shift', 'employee.clock_in_out',
    'finance.view_reports', 'finance.view_transactions', 'finance.export_data', 'finance.manage_tax', 'finance.manage_discount', 'finance.manage_payment', 'finance.manage_expenses',
    'store.view', 'store.create', 'store.edit', 'store.delete',
    'settings.store_profile', 'settings.receipt_template', 'settings.manage_table', 'settings.manage_printer',
    'customer.view', 'customer.create', 'customer.edit', 'customer.manage_loyalty',
    'kitchen.view_orders', 'kitchen.update_status',
    'laundry.view_orders', 'laundry.update_status',
  ],
  manager: [
    'pos.create_transaction', 'pos.void_transaction', 'pos.apply_discount', 'pos.view_cart',
    'product.view', 'product.create', 'product.edit', 'product.manage_stock',
    'inventory.view', 'inventory.adjust', 'inventory.transfer',
    'employee.view', 'employee.clock_in_out',
    'finance.view_reports', 'finance.view_transactions', 'finance.export_data', 'finance.manage_discount',
    'store.view',
    'customer.view', 'customer.create', 'customer.edit', 'customer.manage_loyalty',
    'kitchen.view_orders', 'kitchen.update_status',
    'laundry.view_orders', 'laundry.update_status',
  ],
  cashier: [
    'pos.create_transaction', 'pos.apply_discount', 'pos.view_cart',
    'employee.clock_in_out', 'employee.manage_shift',
    'finance.view_transactions',
    'customer.view', 'customer.create',
    'kitchen.view_orders',
    'laundry.view_orders', 'laundry.update_status',
  ],
  staff: [
    'pos.create_transaction', 'pos.view_cart',
    'employee.clock_in_out', 'employee.manage_shift',
    'customer.view',
    'kitchen.view_orders', 'kitchen.update_status',
    'laundry.view_orders', 'laundry.update_status',
  ],
  accountant: [
    'finance.view_reports', 'finance.view_transactions', 'finance.export_data', 'finance.manage_tax', 'finance.manage_expenses',
    'product.view',
    'inventory.view',
    'customer.view',
    'store.view',
  ],
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(data: {
    companyId: string;
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    phone?: string;
  }): Promise<User> {
    // Check if email already exists in company
    const existing = await this.userRepository.findOne({
      where: { companyId: data.companyId, email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists in this company');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = this.userRepository.create({
      ...data,
      passwordHash,
      role: data.role || UserRole.ADMIN,
      // User dibuat oleh admin/owner via dashboard — tidak perlu verifikasi email
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
      // Assign default permissions berdasarkan role
      permissions: ROLE_DEFAULT_PERMISSIONS[data.role || 'admin'] || [],
    });

    return this.userRepository.save(user);
  }

  async findAll(companyId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, companyId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string, companyId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, companyId },
    });
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      role: UserRole;
      permissions: string[];
      isActive: boolean;
    }>,
  ): Promise<User> {
    const user = await this.findOne(id, companyId);

    // Check email uniqueness if changing
    if (data.email && data.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { companyId, email: data.email },
      });

      if (existing) {
        throw new ConflictException('Email already exists in this company');
      }
    }

    Object.assign(user, data);

    // Jika role berubah dan permissions tidak di-set manual, update ke default permissions role baru
    if (data.role && !data.permissions) {
      user.permissions = ROLE_DEFAULT_PERMISSIONS[data.role] || user.permissions || [];
    }

    return this.userRepository.save(user);
  }

  async updatePassword(
    id: string,
    companyId: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findOne(id, companyId);
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
  }

  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
  }

  async updateLastLogin(id: string, ip: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    });
  }

  async remove(id: string, companyId: string): Promise<void> {
    const user = await this.findOne(id, companyId);
    await this.userRepository.softRemove(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}
