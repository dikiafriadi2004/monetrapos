import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    const role = this.roleRepo.create({
      name: dto.name,
      description: dto.description,
      storeId: dto.storeId,
    });

    if (dto.permissionIds?.length) {
      role.permissions = await this.permissionRepo.findBy({
        id: In(dto.permissionIds),
      });
    }

    return this.roleRepo.save(role);
  }

  async findAllByStore(storeId: string): Promise<Role[]> {
    return this.roleRepo.find({
      where: { storeId },
      relations: ['permissions'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);
    if (role.isSystemRole)
      throw new BadRequestException('Cannot modify system roles');

    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;

    if (dto.permissionIds) {
      role.permissions = await this.permissionRepo.findBy({
        id: In(dto.permissionIds),
      });
    }

    return this.roleRepo.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (role.isSystemRole)
      throw new BadRequestException('Cannot delete system roles');
    await this.roleRepo.remove(role);
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({
      order: { category: 'ASC', code: 'ASC' },
    });
  }

  async createDefaultRoles(storeId: string): Promise<void> {
    const allPermissions = await this.permissionRepo.find();

    // Helper to get permissions by codes
    const getPermissionsByCodes = (codes: string[]) =>
      allPermissions.filter((p) => codes.includes(p.code));

    // Helper to get permissions by category
    const getPermissionsByCategory = (category: string) =>
      allPermissions.filter((p) => p.category === category);

    // 1. Owner - Full access to all permissions
    const owner = this.roleRepo.create({
      name: 'Owner',
      description:
        'Full access to all features including subscription and billing',
      storeId,
      isSystemRole: true,
      permissions: allPermissions,
    });

    // 2. Admin - Almost all except subscription management
    const adminPermissions = allPermissions.filter(
      (p) => p.code !== 'settings.subscription',
    );
    const admin = this.roleRepo.create({
      name: 'Admin',
      description: 'Manage products, inventory, employees, and customers',
      storeId,
      isSystemRole: true,
      permissions: adminPermissions,
    });

    // 3. Manager - Store operations, shifts, reports, approve transactions
    const managerCodes = [
      'pos.create_transaction',
      'pos.void_transaction',
      'pos.refund',
      'pos.apply_discount',
      'pos.view_cart',
      'product.view',
      'inventory.view',
      'employee.view',
      'employee.manage_shift',
      'finance.view_reports',
      'finance.view_transactions',
      'finance.manage_discount',
      'store.view',
      'customer.view',
      'customer.create',
      'customer.edit',
      'customer.manage_loyalty',
      'settings.manage_table',
    ];
    const manager = this.roleRepo.create({
      name: 'Manager',
      description: 'Manage store operations, shifts, and view reports',
      storeId,
      isSystemRole: true,
      permissions: getPermissionsByCodes(managerCodes),
    });

    // 4. Cashier - POS transactions and customer management
    const cashierCodes = [
      'pos.create_transaction',
      'pos.view_cart',
      'product.view',
      'customer.view',
      'customer.create',
      'customer.edit',
      'customer.manage_loyalty',
      'employee.clock_in_out',
    ];
    const cashier = this.roleRepo.create({
      name: 'Cashier',
      description: 'Process POS transactions and manage customers',
      storeId,
      isSystemRole: true,
      permissions: getPermissionsByCodes(cashierCodes),
    });

    // 5. Inventory Staff - Inventory and stock management
    const inventoryStaffCodes = [
      'product.view',
      'product.create',
      'product.edit',
      'product.manage_stock',
      'inventory.view',
      'inventory.adjust',
      'inventory.transfer',
      'inventory.opname',
      'employee.clock_in_out',
    ];
    const inventoryStaff = this.roleRepo.create({
      name: 'Inventory Staff',
      description: 'Manage inventory, stock levels, and transfers',
      storeId,
      isSystemRole: true,
      permissions: getPermissionsByCodes(inventoryStaffCodes),
    });

    // 6. Kitchen Staff - View and update kitchen orders (FnB specific)
    const kitchenStaffCodes = [
      'kitchen.view_orders',
      'kitchen.update_status',
      'product.view',
      'employee.clock_in_out',
    ];
    const kitchenStaff = this.roleRepo.create({
      name: 'Kitchen Staff',
      description: 'View and update kitchen order status (FnB)',
      storeId,
      isSystemRole: true,
      permissions: getPermissionsByCodes(kitchenStaffCodes),
    });

    // 7. Laundry Staff - View and update laundry orders (Laundry specific)
    const laundryStaffCodes = [
      'laundry.view_orders',
      'laundry.update_status',
      'product.view',
      'customer.view',
      'employee.clock_in_out',
    ];
    const laundryStaff = this.roleRepo.create({
      name: 'Laundry Staff',
      description: 'View and update laundry order status',
      storeId,
      isSystemRole: true,
      permissions: getPermissionsByCodes(laundryStaffCodes),
    });

    // 8. Accountant - View all financial reports and export data
    const accountantCodes = [
      'finance.view_reports',
      'finance.view_transactions',
      'finance.export_data',
      'finance.manage_expenses',
      'finance.manage_tax',
      'product.view',
      'inventory.view',
      'customer.view',
      'store.view',
    ];
    const accountant = this.roleRepo.create({
      name: 'Accountant',
      description: 'View financial reports, export data, and manage expenses',
      storeId,
      isSystemRole: true,
      permissions: getPermissionsByCodes(accountantCodes),
    });

    await this.roleRepo.save([
      owner,
      admin,
      manager,
      cashier,
      inventoryStaff,
      kitchenStaff,
      laundryStaff,
      accountant,
    ]);
  }
}
