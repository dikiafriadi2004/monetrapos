import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../modules/roles/permission.entity';

const PERMISSIONS = [
  // POS
  { code: 'pos.create_transaction', name: 'Buat Transaksi', category: 'POS' },
  { code: 'pos.void_transaction', name: 'Void Transaksi', category: 'POS' },
  { code: 'pos.refund', name: 'Refund Transaksi', category: 'POS' },
  { code: 'pos.apply_discount', name: 'Apply Diskon', category: 'POS' },
  { code: 'pos.view_cart', name: 'Lihat Keranjang', category: 'POS' },

  // Products
  { code: 'product.view', name: 'Lihat Produk', category: 'Products' },
  { code: 'product.create', name: 'Tambah Produk', category: 'Products' },
  { code: 'product.edit', name: 'Edit Produk', category: 'Products' },
  { code: 'product.delete', name: 'Hapus Produk', category: 'Products' },
  { code: 'product.manage_stock', name: 'Kelola Stok', category: 'Products' },

  // Employees
  { code: 'employee.view', name: 'Lihat Karyawan', category: 'Employees' },
  { code: 'employee.create', name: 'Tambah Karyawan', category: 'Employees' },
  { code: 'employee.edit', name: 'Edit Karyawan', category: 'Employees' },
  { code: 'employee.delete', name: 'Hapus Karyawan', category: 'Employees' },
  { code: 'employee.manage_role', name: 'Kelola Role', category: 'Employees' },
  { code: 'employee.manage_shift', name: 'Kelola Shift', category: 'Employees' },

  // Finance
  { code: 'finance.view_reports', name: 'Lihat Laporan', category: 'Finance' },
  { code: 'finance.view_transactions', name: 'Lihat Riwayat Transaksi', category: 'Finance' },
  { code: 'finance.export_data', name: 'Export Data', category: 'Finance' },
  { code: 'finance.manage_tax', name: 'Kelola Pajak', category: 'Finance' },
  { code: 'finance.manage_discount', name: 'Kelola Diskon', category: 'Finance' },
  { code: 'finance.manage_payment', name: 'Kelola Pembayaran', category: 'Finance' },

  // Settings
  { code: 'settings.store_profile', name: 'Profil Toko', category: 'Settings' },
  { code: 'settings.receipt_template', name: 'Template Struk', category: 'Settings' },
  { code: 'settings.manage_table', name: 'Kelola Meja', category: 'Settings' },
  { code: 'settings.manage_printer', name: 'Kelola Printer', category: 'Settings' },

  // Customers
  { code: 'customer.view', name: 'Lihat Pelanggan', category: 'Customers' },
  { code: 'customer.create', name: 'Tambah Pelanggan', category: 'Customers' },
  { code: 'customer.manage_loyalty', name: 'Kelola Loyalty', category: 'Customers' },
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
