"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PermissionSeeder_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionSeeder = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const permission_entity_1 = require("../../modules/roles/permission.entity");
const PERMISSIONS = [
    { code: 'pos.create_transaction', name: 'Buat Transaksi', category: 'POS' },
    { code: 'pos.void_transaction', name: 'Void Transaksi', category: 'POS' },
    { code: 'pos.refund', name: 'Refund Transaksi', category: 'POS' },
    { code: 'pos.apply_discount', name: 'Apply Diskon', category: 'POS' },
    { code: 'pos.view_cart', name: 'Lihat Keranjang', category: 'POS' },
    { code: 'product.view', name: 'Lihat Produk', category: 'Products' },
    { code: 'product.create', name: 'Tambah Produk', category: 'Products' },
    { code: 'product.edit', name: 'Edit Produk', category: 'Products' },
    { code: 'product.delete', name: 'Hapus Produk', category: 'Products' },
    { code: 'product.manage_stock', name: 'Kelola Stok', category: 'Products' },
    { code: 'employee.view', name: 'Lihat Karyawan', category: 'Employees' },
    { code: 'employee.create', name: 'Tambah Karyawan', category: 'Employees' },
    { code: 'employee.edit', name: 'Edit Karyawan', category: 'Employees' },
    { code: 'employee.delete', name: 'Hapus Karyawan', category: 'Employees' },
    { code: 'employee.manage_role', name: 'Kelola Role', category: 'Employees' },
    { code: 'employee.manage_shift', name: 'Kelola Shift', category: 'Employees' },
    { code: 'finance.view_reports', name: 'Lihat Laporan', category: 'Finance' },
    { code: 'finance.view_transactions', name: 'Lihat Riwayat Transaksi', category: 'Finance' },
    { code: 'finance.export_data', name: 'Export Data', category: 'Finance' },
    { code: 'finance.manage_tax', name: 'Kelola Pajak', category: 'Finance' },
    { code: 'finance.manage_discount', name: 'Kelola Diskon', category: 'Finance' },
    { code: 'finance.manage_payment', name: 'Kelola Pembayaran', category: 'Finance' },
    { code: 'settings.store_profile', name: 'Profil Toko', category: 'Settings' },
    { code: 'settings.receipt_template', name: 'Template Struk', category: 'Settings' },
    { code: 'settings.manage_table', name: 'Kelola Meja', category: 'Settings' },
    { code: 'settings.manage_printer', name: 'Kelola Printer', category: 'Settings' },
    { code: 'customer.view', name: 'Lihat Pelanggan', category: 'Customers' },
    { code: 'customer.create', name: 'Tambah Pelanggan', category: 'Customers' },
    { code: 'customer.manage_loyalty', name: 'Kelola Loyalty', category: 'Customers' },
];
let PermissionSeeder = PermissionSeeder_1 = class PermissionSeeder {
    permissionRepo;
    logger = new common_1.Logger(PermissionSeeder_1.name);
    constructor(permissionRepo) {
        this.permissionRepo = permissionRepo;
    }
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
};
exports.PermissionSeeder = PermissionSeeder;
exports.PermissionSeeder = PermissionSeeder = PermissionSeeder_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(permission_entity_1.Permission)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PermissionSeeder);
//# sourceMappingURL=permission.seeder.js.map