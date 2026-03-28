import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permissionRepo: Repository<Permission>,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    const role = this.roleRepo.create({
      name: dto.name,
      description: dto.description,
      storeId: dto.storeId,
    });

    if (dto.permissionIds?.length) {
      role.permissions = await this.permissionRepo.findBy({ id: In(dto.permissionIds) });
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
    if (role.isSystemRole) throw new BadRequestException('Cannot modify system roles');

    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;

    if (dto.permissionIds) {
      role.permissions = await this.permissionRepo.findBy({ id: In(dto.permissionIds) });
    }

    return this.roleRepo.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (role.isSystemRole) throw new BadRequestException('Cannot delete system roles');
    await this.roleRepo.remove(role);
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({ order: { category: 'ASC', code: 'ASC' } });
  }

  async createDefaultRoles(storeId: string): Promise<void> {
    const allPermissions = await this.permissionRepo.find();

    const posPermissions = allPermissions.filter((p) => p.category === 'POS');
    const productViewPerm = allPermissions.filter((p) => p.code === 'product.view');

    // Owner - all permissions
    const owner = this.roleRepo.create({
      name: 'Owner',
      storeId,
      isSystemRole: true,
      permissions: allPermissions,
    });

    // Admin - almost all except employee management
    const adminPermissions = allPermissions.filter(
      (p) => !['employee.create', 'employee.delete', 'employee.manage_role'].includes(p.code),
    );
    const admin = this.roleRepo.create({
      name: 'Admin',
      storeId,
      isSystemRole: true,
      permissions: adminPermissions,
    });

    // Manager - reports, void, discount, stock, shifts
    const managerCodes = [
      'pos.create_transaction', 'pos.void_transaction', 'pos.refund', 'pos.apply_discount', 'pos.view_cart',
      'product.view', 'product.manage_stock',
      'employee.view', 'employee.manage_shift',
      'finance.view_reports', 'finance.view_transactions', 'finance.manage_discount',
      'customer.view', 'customer.create', 'customer.manage_loyalty',
    ];
    const managerPermissions = allPermissions.filter((p) => managerCodes.includes(p.code));
    const manager = this.roleRepo.create({
      name: 'Manager',
      storeId,
      isSystemRole: true,
      permissions: managerPermissions,
    });

    // Kasir - POS only + product view
    const kasir = this.roleRepo.create({
      name: 'Kasir',
      storeId,
      isSystemRole: true,
      permissions: [...posPermissions.filter((p) => p.code === 'pos.create_transaction' || p.code === 'pos.view_cart'), ...productViewPerm],
    });

    await this.roleRepo.save([owner, admin, manager, kasir]);
  }
}
