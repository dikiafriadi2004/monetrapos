#!/usr/bin/env ts-node
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Permission } from '../modules/roles/permission.entity';
import { Role } from '../modules/roles/role.entity';
import { Store } from '../modules/stores/store.entity';
import { Company } from '../modules/companies/company.entity';
import { Employee } from '../modules/employees/employee.entity';
import { User } from '../modules/users/user.entity';
import { Subscription } from '../modules/subscriptions/subscription.entity';
import { SubscriptionPlan } from '../modules/subscriptions/subscription-plan.entity';
import { SubscriptionDuration } from '../modules/subscriptions/subscription-duration.entity';
import { Product } from '../modules/products/product.entity';
import { Category } from '../modules/products/category.entity';
import { ProductVariant } from '../modules/products/product-variant.entity';
import { Tax } from '../modules/taxes/tax.entity';
import { Discount } from '../modules/discounts/discount.entity';
import { DiscountUsage } from '../modules/discounts/discount-usage.entity';
import { PaymentMethod } from '../modules/payments/payment-method.entity';
import { QrisConfig } from '../modules/payments/qris-config.entity';
import { PaymentMethod as CompanyPaymentMethod } from '../modules/payment-methods/payment-method.entity';
import { Transaction } from '../modules/transactions/transaction.entity';
import { TransactionItem } from '../modules/transactions/transaction-item.entity';
import { Feature } from '../modules/features/feature.entity';
import { Invoice } from '../modules/billing/invoice.entity';
import { PaymentTransaction } from '../modules/billing/payment-transaction.entity';
import { UsageTracking } from '../modules/usage/usage-tracking.entity';
import { EmailVerificationToken } from '../modules/auth/email-verification-token.entity';
import { PasswordResetToken } from '../modules/auth/password-reset-token.entity';
import { Notification } from '../modules/notifications/notification.entity';
import { AuditLog } from '../modules/audit/audit-log.entity';
import { Customer } from '../modules/customers/customer.entity';
import { Shift } from '../modules/shifts/shift.entity';
import { StockMovement } from '../modules/inventory/stock-movement.entity';
import { StockOpname, StockOpnameItem } from '../modules/inventory/stock-opname.entity';
import { AddOn } from '../modules/add-ons/add-on.entity';
import { CompanyAddOn } from '../modules/add-ons/company-add-on.entity';
import { Supplier } from '../modules/suppliers/supplier.entity';
import { PurchaseOrder, PurchaseOrderItem } from '../modules/purchase-orders/purchase-order.entity';
import { Table } from '../modules/fnb/table.entity';
import { FnbOrder } from '../modules/fnb/fnb-order.entity';
import { LaundryServiceType } from '../modules/laundry/laundry-service-type.entity';
import { LaundryOrder } from '../modules/laundry/laundry-order.entity';
import { LaundryItem } from '../modules/laundry/laundry-item.entity';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'monetrapos',
  entities: [
    Permission, Role, Store, Company, Employee, User,
    Subscription, SubscriptionPlan, SubscriptionDuration,
    Product, Category, ProductVariant, Tax, Discount, DiscountUsage,
    PaymentMethod, QrisConfig, CompanyPaymentMethod,
    Transaction, TransactionItem, Feature,
    Invoice, PaymentTransaction, UsageTracking,
    EmailVerificationToken, PasswordResetToken,
    Notification, AuditLog, Customer, Shift,
    StockMovement, StockOpname, StockOpnameItem,
    AddOn, CompanyAddOn, Supplier,
    PurchaseOrder, PurchaseOrderItem,
    Table, FnbOrder,
    LaundryServiceType, LaundryOrder, LaundryItem,
  ],
  synchronize: false,
  logging: false,
});

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

async function seed() {
  console.log('🌱 Seeding permissions...');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const permRepo = AppDataSource.getRepository(Permission);

    // Check if permissions already exist
    const existingCount = await permRepo.count();
    if (existingCount > 0) {
      console.log(
        `⚠️  Permissions already exist (${existingCount} found). Skipping...`,
      );
      await AppDataSource.destroy();
      return;
    }

    // Create permissions
    for (const permData of PERMISSIONS) {
      const permission = permRepo.create(permData);
      await permRepo.save(permission);
    }

    console.log(`✅ Seeded ${PERMISSIONS.length} permissions`);
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    process.exit(1);
  }
}

seed();

