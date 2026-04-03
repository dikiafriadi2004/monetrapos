import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolesService } from './roles.service';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;
  let roleRepo: Repository<Role>;
  let permissionRepo: Repository<Permission>;

  const mockRoleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn(),
    remove: jest.fn(),
  };

  const mockPermissionRepository = {
    find: jest.fn(),
    findBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleRepo = module.get<Repository<Role>>(getRepositoryToken(Role));
    permissionRepo = module.get<Repository<Permission>>(
      getRepositoryToken(Permission),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDefaultRoles', () => {
    it('should create all 8 default roles with correct permissions', async () => {
      const storeId = 'store-123';
      const mockPermissions: Permission[] = [
        {
          id: '1',
          code: 'pos.create_transaction',
          name: 'Create Transaction',
          category: 'POS',
        } as Permission,
        {
          id: '2',
          code: 'product.view',
          name: 'View Product',
          category: 'Products',
        } as Permission,
        {
          id: '3',
          code: 'product.create',
          name: 'Create Product',
          category: 'Products',
        } as Permission,
        {
          id: '4',
          code: 'inventory.view',
          name: 'View Inventory',
          category: 'Inventory',
        } as Permission,
        {
          id: '5',
          code: 'inventory.adjust',
          name: 'Adjust Inventory',
          category: 'Inventory',
        } as Permission,
        {
          id: '6',
          code: 'employee.view',
          name: 'View Employee',
          category: 'Employees',
        } as Permission,
        {
          id: '7',
          code: 'finance.view_reports',
          name: 'View Reports',
          category: 'Finance',
        } as Permission,
        {
          id: '8',
          code: 'finance.export_data',
          name: 'Export Data',
          category: 'Finance',
        } as Permission,
        {
          id: '9',
          code: 'kitchen.view_orders',
          name: 'View Kitchen Orders',
          category: 'Kitchen',
        } as Permission,
        {
          id: '10',
          code: 'laundry.view_orders',
          name: 'View Laundry Orders',
          category: 'Laundry',
        } as Permission,
        {
          id: '11',
          code: 'settings.subscription',
          name: 'Manage Subscription',
          category: 'Settings',
        } as Permission,
        {
          id: '12',
          code: 'employee.clock_in_out',
          name: 'Clock In/Out',
          category: 'Employees',
        } as Permission,
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);
      mockRoleRepository.create.mockImplementation((data) => data);
      mockRoleRepository.save.mockResolvedValue([]);

      await service.createDefaultRoles(storeId);

      expect(mockPermissionRepository.find).toHaveBeenCalled();
      expect(mockRoleRepository.create).toHaveBeenCalledTimes(8);
      expect(mockRoleRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Owner' }),
          expect.objectContaining({ name: 'Admin' }),
          expect.objectContaining({ name: 'Manager' }),
          expect.objectContaining({ name: 'Cashier' }),
          expect.objectContaining({ name: 'Inventory Staff' }),
          expect.objectContaining({ name: 'Kitchen Staff' }),
          expect.objectContaining({ name: 'Laundry Staff' }),
          expect.objectContaining({ name: 'Accountant' }),
        ]),
      );
    });

    it('should assign all permissions to Owner role', async () => {
      const storeId = 'store-123';
      const mockPermissions: Permission[] = [
        {
          id: '1',
          code: 'pos.create_transaction',
          category: 'POS',
        } as Permission,
        { id: '2', code: 'product.view', category: 'Products' } as Permission,
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);
      mockRoleRepository.create.mockImplementation((data) => data);
      mockRoleRepository.save.mockResolvedValue([]);

      await service.createDefaultRoles(storeId);

      const ownerRole = mockRoleRepository.create.mock.calls.find(
        (call) => call[0].name === 'Owner',
      );
      expect(ownerRole[0].permissions).toEqual(mockPermissions);
      expect(ownerRole[0].isSystemRole).toBe(true);
    });

    it('should exclude subscription permission from Admin role', async () => {
      const storeId = 'store-123';
      const mockPermissions: Permission[] = [
        { id: '1', code: 'product.view', category: 'Products' } as Permission,
        {
          id: '2',
          code: 'settings.subscription',
          category: 'Settings',
        } as Permission,
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);
      mockRoleRepository.create.mockImplementation((data) => data);
      mockRoleRepository.save.mockResolvedValue([]);

      await service.createDefaultRoles(storeId);

      const adminRole = mockRoleRepository.create.mock.calls.find(
        (call) => call[0].name === 'Admin',
      );
      expect(adminRole[0].permissions).not.toContainEqual(
        expect.objectContaining({ code: 'settings.subscription' }),
      );
    });

    it('should assign only POS and customer permissions to Cashier role', async () => {
      const storeId = 'store-123';
      const mockPermissions: Permission[] = [
        {
          id: '1',
          code: 'pos.create_transaction',
          category: 'POS',
        } as Permission,
        { id: '2', code: 'product.view', category: 'Products' } as Permission,
        { id: '3', code: 'customer.view', category: 'Customers' } as Permission,
        {
          id: '4',
          code: 'employee.clock_in_out',
          category: 'Employees',
        } as Permission,
        { id: '5', code: 'product.delete', category: 'Products' } as Permission,
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);
      mockRoleRepository.create.mockImplementation((data) => data);
      mockRoleRepository.save.mockResolvedValue([]);

      await service.createDefaultRoles(storeId);

      const cashierRole = mockRoleRepository.create.mock.calls.find(
        (call) => call[0].name === 'Cashier',
      );
      const cashierPermissionCodes = cashierRole[0].permissions.map(
        (p: Permission) => p.code,
      );
      expect(cashierPermissionCodes).toContain('pos.create_transaction');
      expect(cashierPermissionCodes).toContain('customer.view');
      expect(cashierPermissionCodes).not.toContain('product.delete');
    });

    it('should assign inventory permissions to Inventory Staff role', async () => {
      const storeId = 'store-123';
      const mockPermissions: Permission[] = [
        {
          id: '1',
          code: 'inventory.view',
          category: 'Inventory',
        } as Permission,
        {
          id: '2',
          code: 'inventory.adjust',
          category: 'Inventory',
        } as Permission,
        { id: '3', code: 'product.view', category: 'Products' } as Permission,
        {
          id: '4',
          code: 'finance.view_reports',
          category: 'Finance',
        } as Permission,
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);
      mockRoleRepository.create.mockImplementation((data) => data);
      mockRoleRepository.save.mockResolvedValue([]);

      await service.createDefaultRoles(storeId);

      const inventoryRole = mockRoleRepository.create.mock.calls.find(
        (call) => call[0].name === 'Inventory Staff',
      );
      const inventoryPermissionCodes = inventoryRole[0].permissions.map(
        (p: Permission) => p.code,
      );
      expect(inventoryPermissionCodes).toContain('inventory.view');
      expect(inventoryPermissionCodes).toContain('inventory.adjust');
      expect(inventoryPermissionCodes).not.toContain('finance.view_reports');
    });

    it('should assign kitchen permissions to Kitchen Staff role', async () => {
      const storeId = 'store-123';
      const mockPermissions: Permission[] = [
        {
          id: '1',
          code: 'kitchen.view_orders',
          category: 'Kitchen',
        } as Permission,
        {
          id: '2',
          code: 'kitchen.update_status',
          category: 'Kitchen',
        } as Permission,
        { id: '3', code: 'product.view', category: 'Products' } as Permission,
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);
      mockRoleRepository.create.mockImplementation((data) => data);
      mockRoleRepository.save.mockResolvedValue([]);

      await service.createDefaultRoles(storeId);

      const kitchenRole = mockRoleRepository.create.mock.calls.find(
        (call) => call[0].name === 'Kitchen Staff',
      );
      const kitchenPermissionCodes = kitchenRole[0].permissions.map(
        (p: Permission) => p.code,
      );
      expect(kitchenPermissionCodes).toContain('kitchen.view_orders');
      expect(kitchenPermissionCodes).toContain('kitchen.update_status');
    });

    it('should assign finance permissions to Accountant role', async () => {
      const storeId = 'store-123';
      const mockPermissions: Permission[] = [
        {
          id: '1',
          code: 'finance.view_reports',
          category: 'Finance',
        } as Permission,
        {
          id: '2',
          code: 'finance.export_data',
          category: 'Finance',
        } as Permission,
        {
          id: '3',
          code: 'pos.create_transaction',
          category: 'POS',
        } as Permission,
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);
      mockRoleRepository.create.mockImplementation((data) => data);
      mockRoleRepository.save.mockResolvedValue([]);

      await service.createDefaultRoles(storeId);

      const accountantRole = mockRoleRepository.create.mock.calls.find(
        (call) => call[0].name === 'Accountant',
      );
      const accountantPermissionCodes = accountantRole[0].permissions.map(
        (p: Permission) => p.code,
      );
      expect(accountantPermissionCodes).toContain('finance.view_reports');
      expect(accountantPermissionCodes).toContain('finance.export_data');
      expect(accountantPermissionCodes).not.toContain('pos.create_transaction');
    });
  });

  describe('update', () => {
    it('should throw BadRequestException when trying to update system role', async () => {
      const roleId = 'role-123';
      const systemRole = {
        id: roleId,
        name: 'Owner',
        isSystemRole: true,
      } as Role;

      mockRoleRepository.findOne.mockResolvedValue(systemRole);

      await expect(
        service.update(roleId, { name: 'New Name' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(roleId, { name: 'New Name' }),
      ).rejects.toThrow('Cannot modify system roles');
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException when trying to delete system role', async () => {
      const roleId = 'role-123';
      const systemRole = {
        id: roleId,
        name: 'Owner',
        isSystemRole: true,
      } as Role;

      mockRoleRepository.findOne.mockResolvedValue(systemRole);

      await expect(service.remove(roleId)).rejects.toThrow(BadRequestException);
      await expect(service.remove(roleId)).rejects.toThrow(
        'Cannot delete system roles',
      );
    });
  });
});
