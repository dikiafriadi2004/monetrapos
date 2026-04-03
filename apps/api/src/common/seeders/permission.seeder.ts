import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../modules/roles/permission.entity';

const PERMISSIONS = [
  // POS
  {
    code: 'pos.create_transaction',
    name: 'Buat Transaksi',
    category: 'POS',
    description: 'Create new POS transactions',
  },
  {
    code: 'pos.void_transaction',
    name: 'Void Transaksi',
    category: 'POS',
    description: 'Void/cancel transactions',
  },
  {
    code: 'pos.refund',
    name: 'Refund Transaksi',
    category: 'POS',
    description: 'Process transaction refunds',
  },
  {
    code: 'pos.apply_discount',
    name: 'Apply Diskon',
    category: 'POS',
    description: 'Apply discounts to transactions',
  },
  {
    code: 'pos.view_cart',
    name: 'Lihat Keranjang',
    category: 'POS',
    description: 'View shopping cart',
  },

  // Products
  {
    code: 'product.view',
    name: 'Lihat Produk',
    category: 'Products',
    description: 'View product catalog',
  },
  {
    code: 'product.create',
    name: 'Tambah Produk',
    category: 'Products',
    description: 'Create new products',
  },
  {
    code: 'product.edit',
    name: 'Edit Produk',
    category: 'Products',
    description: 'Edit product information',
  },
  {
    code: 'product.delete',
    name: 'Hapus Produk',
    category: 'Products',
    description: 'Delete products',
  },
  {
    code: 'product.manage_stock',
    name: 'Kelola Stok',
    category: 'Products',
    description: 'Manage product inventory',
  },

  // Inventory
  {
    code: 'inventory.view',
    name: 'Lihat Inventory',
    category: 'Inventory',
    description: 'View inventory levels',
  },
  {
    code: 'inventory.adjust',
    name: 'Adjust Stok',
    category: 'Inventory',
    description: 'Adjust stock levels',
  },
  {
    code: 'inventory.transfer',
    name: 'Transfer Stok',
    category: 'Inventory',
    description: 'Transfer stock between stores',
  },
  {
    code: 'inventory.opname',
    name: 'Stock Opname',
    category: 'Inventory',
    description: 'Perform stock taking',
  },

  // Employees
  {
    code: 'employee.view',
    name: 'Lihat Karyawan',
    category: 'Employees',
    description: 'View employee list',
  },
  {
    code: 'employee.create',
    name: 'Tambah Karyawan',
    category: 'Employees',
    description: 'Create new employees',
  },
  {
    code: 'employee.edit',
    name: 'Edit Karyawan',
    category: 'Employees',
    description: 'Edit employee information',
  },
  {
    code: 'employee.delete',
    name: 'Hapus Karyawan',
    category: 'Employees',
    description: 'Delete employees',
  },
  {
    code: 'employee.manage_role',
    name: 'Kelola Role',
    category: 'Employees',
    description: 'Manage employee roles',
  },
  {
    code: 'employee.manage_shift',
    name: 'Kelola Shift',
    category: 'Employees',
    description: 'Manage employee shifts',
  },
  {
    code: 'employee.clock_in_out',
    name: 'Clock In/Out',
    category: 'Employees',
    description: 'Clock in and out',
  },

  // Finance
  {
    code: 'finance.view_reports',
    name: 'Lihat Laporan',
    category: 'Finance',
    description: 'View financial reports',
  },
  {
    code: 'finance.view_transactions',
    name: 'Lihat Riwayat Transaksi',
    category: 'Finance',
    description: 'View transaction history',
  },
  {
    code: 'finance.export_data',
    name: 'Export Data',
    category: 'Finance',
    description: 'Export financial data',
  },
  {
    code: 'finance.manage_tax',
    name: 'Kelola Pajak',
    category: 'Finance',
    description: 'Manage tax settings',
  },
  {
    code: 'finance.manage_discount',
    name: 'Kelola Diskon',
    category: 'Finance',
    description: 'Manage discounts',
  },
  {
    code: 'finance.manage_payment',
    name: 'Kelola Pembayaran',
    category: 'Finance',
    description: 'Manage payment methods',
  },
  {
    code: 'finance.manage_expenses',
    name: 'Kelola Expenses',
    category: 'Finance',
    description: 'Manage business expenses',
  },

  // Stores
  {
    code: 'store.view',
    name: 'Lihat Toko',
    category: 'Stores',
    description: 'View store information',
  },
  {
    code: 'store.create',
    name: 'Tambah Toko',
    category: 'Stores',
    description: 'Create new stores',
  },
  {
    code: 'store.edit',
    name: 'Edit Toko',
    category: 'Stores',
    description: 'Edit store information',
  },
  {
    code: 'store.delete',
    name: 'Hapus Toko',
    category: 'Stores',
    description: 'Delete stores',
  },

  // Settings
  {
    code: 'settings.store_profile',
    name: 'Profil Toko',
    category: 'Settings',
    description: 'Manage store profile',
  },
  {
    code: 'settings.receipt_template',
    name: 'Template Struk',
    category: 'Settings',
    description: 'Customize receipt template',
  },
  {
    code: 'settings.manage_table',
    name: 'Kelola Meja',
    category: 'Settings',
    description: 'Manage tables (FnB)',
  },
  {
    code: 'settings.manage_printer',
    name: 'Kelola Printer',
    category: 'Settings',
    description: 'Manage printer settings',
  },
  {
    code: 'settings.subscription',
    name: 'Kelola Subscription',
    category: 'Settings',
    description: 'Manage subscription and billing',
  },

  // Customers
  {
    code: 'customer.view',
    name: 'Lihat Pelanggan',
    category: 'Customers',
    description: 'View customer list',
  },
  {
    code: 'customer.create',
    name: 'Tambah Pelanggan',
    category: 'Customers',
    description: 'Create new customers',
  },
  {
    code: 'customer.edit',
    name: 'Edit Pelanggan',
    category: 'Customers',
    description: 'Edit customer information',
  },
  {
    code: 'customer.manage_loyalty',
    name: 'Kelola Loyalty',
    category: 'Customers',
    description: 'Manage loyalty points',
  },

  // Kitchen (FnB specific)
  {
    code: 'kitchen.view_orders',
    name: 'Lihat Order',
    category: 'Kitchen',
    description: 'View kitchen orders',
  },
  {
    code: 'kitchen.update_status',
    name: 'Update Status Order',
    category: 'Kitchen',
    description: 'Update order preparation status',
  },

  // Laundry (Laundry specific)
  {
    code: 'laundry.view_orders',
    name: 'Lihat Order Laundry',
    category: 'Laundry',
    description: 'View laundry orders',
  },
  {
    code: 'laundry.update_status',
    name: 'Update Status Laundry',
    category: 'Laundry',
    description: 'Update laundry order status',
  },
];

@Injectable()
export class PermissionSeeder implements OnModuleInit {
  private readonly logger = new Logger(PermissionSeeder.name);

  constructor(
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
  ) {}

  async onModuleInit() {
    const existingCount = await this.permissionRepo.count();
    if (existingCount > 0) {
      this.logger.log(`Permissions already seeded (${existingCount} found)`);
      return;
    }

    this.logger.log('Seeding permissions...');
    for (const perm of PERMISSIONS) {
      const permission = this.permissionRepo.create(perm);
      await this.permissionRepo.save(permission);
    }
    this.logger.log(`Seeded ${PERMISSIONS.length} permissions`);
  }
}
