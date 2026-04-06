#!/usr/bin/env ts-node
/**
 * Full database seed script
 * Runs all migrations then seeds all required data
 *
 * Usage: npm run seed:full
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

config({ path: '.env' });

// ─── Import all entities ──────────────────────────────────────────────────────
import { Company } from '../modules/companies/company.entity';
import { User, UserRole } from '../modules/users/user.entity';
import { SubscriptionPlan } from '../modules/subscriptions/subscription-plan.entity';
import { Subscription } from '../modules/subscriptions/subscription.entity';
import { SubscriptionDuration } from '../modules/subscriptions/subscription-duration.entity';
import { SubscriptionHistory } from '../modules/subscriptions/subscription-history.entity';
import { Permission } from '../modules/roles/permission.entity';
import { Role } from '../modules/roles/role.entity';
import { Store } from '../modules/stores/store.entity';
import { Employee } from '../modules/employees/employee.entity';
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
import { PaymentWebhook } from '../modules/billing/payment-webhook.entity';
import { UsageTracking } from '../modules/usage/usage-tracking.entity';
import { EmailVerificationToken } from '../modules/auth/email-verification-token.entity';
import { PasswordResetToken } from '../modules/auth/password-reset-token.entity';
import { Notification } from '../modules/notifications/notification.entity';
import { AuditLog } from '../modules/audit/audit-log.entity';
import { Customer } from '../modules/customers/customer.entity';
import { LoyaltyPointTransaction } from '../modules/customers/loyalty-point-transaction.entity';
import { Shift } from '../modules/shifts/shift.entity';
import { EmployeeAttendance } from '../modules/employees/employee-attendance.entity';
import { Inventory } from '../modules/inventory/inventory.entity';
import { StockMovement } from '../modules/inventory/stock-movement.entity';
import { StockOpname, StockOpnameItem } from '../modules/inventory/stock-opname.entity';
import { AddOn, AddOnCategory, AddOnPricingType, AddOnStatus } from '../modules/add-ons/add-on.entity';
import { CompanyAddOn } from '../modules/add-ons/company-add-on.entity';
import { Supplier } from '../modules/suppliers/supplier.entity';import { PurchaseOrder, PurchaseOrderItem } from '../modules/purchase-orders/purchase-order.entity';
import { Table } from '../modules/fnb/table.entity';
import { FnbOrder } from '../modules/fnb/fnb-order.entity';
import { FnbModifierGroup, FnbModifierOption } from '../modules/fnb/fnb-modifier.entity';
import { LaundryServiceType } from '../modules/laundry/laundry-service-type.entity';
import { LaundryOrder } from '../modules/laundry/laundry-order.entity';
import { LaundryItem } from '../modules/laundry/laundry-item.entity';
import { LandingContent } from '../modules/landing/landing-content.entity';
import { EmailConfig } from '../modules/email/email-config.entity';
import { AdminUser, AdminRole } from '../modules/admin-auth/admin-user.entity';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'monetrapos',
  entities: [
    Company, User, SubscriptionPlan, Subscription, SubscriptionDuration, SubscriptionHistory,
    Permission, Role, Store, Employee, EmployeeAttendance,
    Product, Category, ProductVariant, Tax, Discount, DiscountUsage,
    PaymentMethod, QrisConfig, CompanyPaymentMethod,
    Transaction, TransactionItem, Feature,
    Invoice, PaymentTransaction, PaymentWebhook, UsageTracking,
    EmailVerificationToken, PasswordResetToken,
    Notification, AuditLog,
    Customer, LoyaltyPointTransaction,
    Shift, Inventory, StockMovement, StockOpname, StockOpnameItem,
    AddOn, CompanyAddOn, Supplier, PurchaseOrder, PurchaseOrderItem,
    Table, FnbOrder, FnbModifierGroup, FnbModifierOption,
    LaundryServiceType, LaundryOrder, LaundryItem,
    LandingContent, EmailConfig, AdminUser,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});

// ─── Seed data ────────────────────────────────────────────────────────────────

async function seedAdmin(ds: DataSource) {
  const adminUserRepo = ds.getRepository(AdminUser);

  const existing = await adminUserRepo.findOne({ where: { email: 'admin@monetrapos.com' } });
  if (existing) {
    console.log('  ⏭  Admin user already exists, skipping');
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = adminUserRepo.create({
    name: 'Super Admin',
    email: 'admin@monetrapos.com',
    passwordHash: hashedPassword,
    role: AdminRole.SUPER_ADMIN,
    isActive: true,
  });
  await adminUserRepo.save(admin);

  console.log('  ✅ Admin seeded → email: admin@monetrapos.com | password: admin123');
}

async function seedPlans(ds: DataSource) {
  const planRepo = ds.getRepository(SubscriptionPlan);
  const durationRepo = ds.getRepository(SubscriptionDuration);

  const plans = [
    {
      name: 'Basic', slug: 'basic',
      description: 'Paket dasar untuk usaha kecil',
      priceMonthly: 99000, priceYearly: 950000, setupFee: 0, trialDays: 14,
      maxStores: 1, maxUsers: 2, maxEmployees: 5, maxProducts: 100,
      maxTransactionsPerMonth: 500, maxCustomers: 200, maxStorageMb: 500,
      features: {
        pos: true,
        inventory: true,
        reports: true,
        receipt_printing: true,
        employees: true,
        customers: true,
        multiStore: false,
        loyaltyProgram: false,
        api: false,
        customReceipt: false,
        prioritySupport: false,
        whiteLabel: false,
      },
      isActive: true, isPopular: false, sortOrder: 1,
    },
    {
      name: 'Professional', slug: 'professional',
      description: 'Paket lengkap untuk usaha menengah',
      priceMonthly: 199000, priceYearly: 1900000, setupFee: 0, trialDays: 14,
      maxStores: 3, maxUsers: 5, maxEmployees: 20, maxProducts: 1000,
      maxTransactionsPerMonth: 5000, maxCustomers: 1000, maxStorageMb: 2000,
      features: {
        pos: true,
        inventory: true,
        reports: true,
        receipt_printing: true,
        employees: true,
        customers: true,
        multiStore: true,
        loyaltyProgram: true,
        api: true,
        customReceipt: true,
        prioritySupport: false,
        whiteLabel: false,
      },
      isActive: true, isPopular: true, sortOrder: 2,
    },
    {
      name: 'Enterprise', slug: 'enterprise',
      description: 'Paket unlimited untuk bisnis besar',
      priceMonthly: 499000, priceYearly: 4800000, setupFee: 0, trialDays: 14,
      maxStores: -1, maxUsers: -1, maxEmployees: -1, maxProducts: -1,
      maxTransactionsPerMonth: -1, maxCustomers: -1, maxStorageMb: -1,
      features: {
        pos: true,
        inventory: true,
        reports: true,
        receipt_printing: true,
        employees: true,
        customers: true,
        multiStore: true,
        loyaltyProgram: true,
        api: true,
        customReceipt: true,
        prioritySupport: true,
        whiteLabel: true,
      },
      isActive: true, isPopular: false, sortOrder: 3,
    },
  ];

  const durations = [
    { durationMonths: 1, discountPercentage: 0 },
    { durationMonths: 3, discountPercentage: 5 },
    { durationMonths: 6, discountPercentage: 10 },
    { durationMonths: 12, discountPercentage: 20 },
  ];

  for (const planData of plans) {
    // Upsert: update if exists, create if not
    let plan = await planRepo.findOne({ where: { slug: planData.slug } });
    if (plan) {
      Object.assign(plan, planData);
      await planRepo.save(plan);
      console.log(`  🔄 Updated plan: ${plan.name}`);
    } else {
      plan = planRepo.create(planData);
      await planRepo.save(plan);
      console.log(`  ✅ Plan: ${plan.name} (Rp ${planData.priceMonthly.toLocaleString()}/bln)`);
    }

    // Upsert durations
    for (const d of durations) {
      const finalPrice = Math.round(planData.priceMonthly * d.durationMonths * (1 - d.discountPercentage / 100));
      const existing = await durationRepo.findOne({ where: { planId: plan.id, durationMonths: d.durationMonths } });
      if (existing) {
        existing.discountPercentage = d.discountPercentage;
        existing.finalPrice = finalPrice;
        await durationRepo.save(existing);
      } else {
        await durationRepo.save(durationRepo.create({ planId: plan.id, durationMonths: d.durationMonths, discountPercentage: d.discountPercentage, finalPrice }));
      }
    }
  }
  console.log(`  ✅ Plans synced (${plans.length} plans)`);
}

async function seedPermissions(ds: DataSource) {
  const permRepo = ds.getRepository(Permission);
  const count = await permRepo.count();
  if (count > 0) {
    console.log(`  ⏭  Permissions already exist (${count}), skipping`);
    return;
  }

  const permissions = [
    { code: 'pos.create_transaction', name: 'Buat Transaksi', category: 'POS', description: 'Create new POS transactions' },
    { code: 'pos.void_transaction', name: 'Void Transaksi', category: 'POS', description: 'Void/cancel transactions' },
    { code: 'pos.refund', name: 'Refund Transaksi', category: 'POS', description: 'Process transaction refunds' },
    { code: 'pos.apply_discount', name: 'Apply Diskon', category: 'POS', description: 'Apply discounts to transactions' },
    { code: 'pos.view_cart', name: 'Lihat Keranjang', category: 'POS', description: 'View shopping cart' },
    { code: 'product.view', name: 'Lihat Produk', category: 'Products', description: 'View product catalog' },
    { code: 'product.create', name: 'Tambah Produk', category: 'Products', description: 'Create new products' },
    { code: 'product.edit', name: 'Edit Produk', category: 'Products', description: 'Edit product information' },
    { code: 'product.delete', name: 'Hapus Produk', category: 'Products', description: 'Delete products' },
    { code: 'product.manage_stock', name: 'Kelola Stok', category: 'Products', description: 'Manage product inventory' },
    { code: 'inventory.view', name: 'Lihat Inventory', category: 'Inventory', description: 'View inventory levels' },
    { code: 'inventory.adjust', name: 'Adjust Stok', category: 'Inventory', description: 'Adjust stock levels' },
    { code: 'inventory.transfer', name: 'Transfer Stok', category: 'Inventory', description: 'Transfer stock between stores' },
    { code: 'inventory.opname', name: 'Stock Opname', category: 'Inventory', description: 'Perform stock taking' },
    { code: 'employee.view', name: 'Lihat Karyawan', category: 'Employees', description: 'View employee list' },
    { code: 'employee.create', name: 'Tambah Karyawan', category: 'Employees', description: 'Create new employees' },
    { code: 'employee.edit', name: 'Edit Karyawan', category: 'Employees', description: 'Edit employee information' },
    { code: 'employee.delete', name: 'Hapus Karyawan', category: 'Employees', description: 'Delete employees' },
    { code: 'employee.manage_role', name: 'Kelola Role', category: 'Employees', description: 'Manage employee roles' },
    { code: 'employee.manage_shift', name: 'Kelola Shift', category: 'Employees', description: 'Manage employee shifts' },
    { code: 'employee.clock_in_out', name: 'Clock In/Out', category: 'Employees', description: 'Clock in and out' },
    { code: 'finance.view_reports', name: 'Lihat Laporan', category: 'Finance', description: 'View financial reports' },
    { code: 'finance.view_transactions', name: 'Lihat Riwayat Transaksi', category: 'Finance', description: 'View transaction history' },
    { code: 'finance.export_data', name: 'Export Data', category: 'Finance', description: 'Export financial data' },
    { code: 'finance.manage_tax', name: 'Kelola Pajak', category: 'Finance', description: 'Manage tax settings' },
    { code: 'finance.manage_discount', name: 'Kelola Diskon', category: 'Finance', description: 'Manage discounts' },
    { code: 'finance.manage_payment', name: 'Kelola Pembayaran', category: 'Finance', description: 'Manage payment methods' },
    { code: 'finance.manage_expenses', name: 'Kelola Expenses', category: 'Finance', description: 'Manage business expenses' },
    { code: 'store.view', name: 'Lihat Toko', category: 'Stores', description: 'View store information' },
    { code: 'store.create', name: 'Tambah Toko', category: 'Stores', description: 'Create new stores' },
    { code: 'store.edit', name: 'Edit Toko', category: 'Stores', description: 'Edit store information' },
    { code: 'store.delete', name: 'Hapus Toko', category: 'Stores', description: 'Delete stores' },
    { code: 'settings.store_profile', name: 'Profil Toko', category: 'Settings', description: 'Manage store profile' },
    { code: 'settings.receipt_template', name: 'Template Struk', category: 'Settings', description: 'Customize receipt template' },
    { code: 'settings.manage_table', name: 'Kelola Meja', category: 'Settings', description: 'Manage tables (FnB)' },
    { code: 'settings.manage_printer', name: 'Kelola Printer', category: 'Settings', description: 'Manage printer settings' },
    { code: 'settings.subscription', name: 'Kelola Subscription', category: 'Settings', description: 'Manage subscription and billing' },
    { code: 'customer.view', name: 'Lihat Pelanggan', category: 'Customers', description: 'View customer list' },
    { code: 'customer.create', name: 'Tambah Pelanggan', category: 'Customers', description: 'Create new customers' },
    { code: 'customer.edit', name: 'Edit Pelanggan', category: 'Customers', description: 'Edit customer information' },
    { code: 'customer.manage_loyalty', name: 'Kelola Loyalty', category: 'Customers', description: 'Manage loyalty points' },
    { code: 'kitchen.view_orders', name: 'Lihat Order', category: 'Kitchen', description: 'View kitchen orders' },
    { code: 'kitchen.update_status', name: 'Update Status Order', category: 'Kitchen', description: 'Update order preparation status' },
    { code: 'laundry.view_orders', name: 'Lihat Order Laundry', category: 'Laundry', description: 'View laundry orders' },
    { code: 'laundry.update_status', name: 'Update Status Laundry', category: 'Laundry', description: 'Update laundry order status' },
  ];

  for (const p of permissions) {
    await permRepo.save(permRepo.create(p));
  }
  console.log(`  ✅ Seeded ${permissions.length} permissions`);
}

async function seedAddOns(ds: DataSource) {
  const repo = ds.getRepository(AddOn);
  const count = await repo.count();
  if (count > 0) {
    console.log(`  ⏭  Add-ons already exist (${count}), skipping`);
    return;
  }

  const addOns = [
    { slug: 'whatsapp-integration', name: 'WhatsApp Business Integration', description: 'Send receipts, notifications, and marketing messages via WhatsApp', category: AddOnCategory.INTEGRATION, pricing_type: AddOnPricingType.RECURRING, price: 99000, status: AddOnStatus.ACTIVE, features: ['Automated receipt delivery', 'Low stock notifications', 'Marketing campaigns', 'Customer support chat'], available_for_plans: [] },
    { slug: 'accounting-integration', name: 'Accounting Software Integration', description: 'Sync transactions with Jurnal.id or Accurate Online', category: AddOnCategory.INTEGRATION, pricing_type: AddOnPricingType.RECURRING, price: 149000, status: AddOnStatus.ACTIVE, features: ['Jurnal.id integration', 'Accurate Online integration', 'Automatic transaction sync', 'Real-time updates'], available_for_plans: [] },
    { slug: 'delivery-integration', name: 'Delivery App Integration', description: 'Integrate with GoFood, GrabFood, and other delivery platforms', category: AddOnCategory.INTEGRATION, pricing_type: AddOnPricingType.RECURRING, price: 199000, status: AddOnStatus.ACTIVE, features: ['GoFood integration', 'GrabFood integration', 'Unified order management', 'Auto menu sync'], available_for_plans: [] },
    { slug: 'advanced-reporting', name: 'Advanced Reporting & Analytics', description: 'Get detailed insights with advanced reports and predictive analytics', category: AddOnCategory.FEATURE, pricing_type: AddOnPricingType.RECURRING, price: 79000, status: AddOnStatus.ACTIVE, features: ['Cohort analysis', 'RFM customer segmentation', 'Sales forecasting', 'Custom report builder', 'Export to Excel/PDF'], available_for_plans: [] },
    { slug: 'loyalty-program-advanced', name: 'Advanced Loyalty Program', description: 'Create tiered loyalty programs with birthday rewards and referrals', category: AddOnCategory.FEATURE, pricing_type: AddOnPricingType.RECURRING, price: 59000, status: AddOnStatus.ACTIVE, features: ['Customer tier system', 'Birthday rewards', 'Referral program', 'Points expiration'], available_for_plans: [] },
    { slug: 'multi-location', name: 'Multi-Location Management', description: 'Manage multiple store locations with centralized control', category: AddOnCategory.FEATURE, pricing_type: AddOnPricingType.RECURRING, price: 299000, status: AddOnStatus.ACTIVE, features: ['Unlimited store locations', 'Centralized inventory', 'Inter-store transfers', 'Consolidated reporting'], available_for_plans: [] },
    { slug: 'priority-support', name: 'Priority Support', description: '24/7 priority support with dedicated account manager', category: AddOnCategory.SUPPORT, pricing_type: AddOnPricingType.RECURRING, price: 199000, status: AddOnStatus.ACTIVE, features: ['24/7 priority support', 'Dedicated account manager', 'Response time < 1 hour', 'Monthly business review'], available_for_plans: [] },
    { slug: 'onsite-training', name: 'On-site Training', description: 'Professional on-site training for your team', category: AddOnCategory.SUPPORT, pricing_type: AddOnPricingType.ONE_TIME, price: 2500000, status: AddOnStatus.ACTIVE, features: ['Full-day training session', 'Up to 20 participants', 'Training materials included', 'Follow-up support (30 days)'], available_for_plans: [] },
    { slug: 'extra-users', name: 'Extra Users Pack', description: 'Add 10 more user accounts to your subscription', category: AddOnCategory.CAPACITY, pricing_type: AddOnPricingType.RECURRING, price: 50000, status: AddOnStatus.ACTIVE, features: ['10 additional users', 'Full role-based access', 'Individual permissions', 'Activity tracking'], available_for_plans: [] },
    { slug: 'extra-products', name: 'Extra Products Pack', description: 'Add 1000 more products to your inventory', category: AddOnCategory.CAPACITY, pricing_type: AddOnPricingType.RECURRING, price: 39000, status: AddOnStatus.ACTIVE, features: ['1000 additional products', 'Unlimited variants', 'Bulk import/export', 'Product categories'], available_for_plans: [] },
  ];

  for (const a of addOns) {
    await repo.save(repo.create(a));
  }
  console.log(`  ✅ Seeded ${addOns.length} add-ons`);
}

async function ensureEmailConfigsTable(ds: DataSource) {
  try {
    const tableExists = await ds.query(`
      SELECT COUNT(*) as cnt FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'email_configs'
    `);
    if (tableExists[0].cnt > 0) {
      console.log('  ⏭  email_configs table already exists');
      return;
    }
    await ds.query(`
      CREATE TABLE email_configs (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        provider ENUM('mailtrap','gmail','smtp') NOT NULL DEFAULT 'mailtrap',
        is_enabled TINYINT NOT NULL DEFAULT 0,
        host VARCHAR(200) NULL,
        port INT NULL,
        secure TINYINT NOT NULL DEFAULT 0,
        username VARCHAR(200) NULL,
        password TEXT NULL,
        from_name VARCHAR(200) NULL,
        from_email VARCHAR(200) NULL,
        oauth_client_id TEXT NULL,
        oauth_client_secret TEXT NULL,
        oauth_refresh_token TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY IDX_email_configs_provider (provider)
      )
    `);
    console.log('  ✅ email_configs table created');
  } catch (err: any) {
    console.log(`  ⚠️  email_configs: ${err.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 MonetraPOS - Full Database Setup\n');
  console.log('📋 Steps: migrations → admin → plans → permissions → add-ons\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    // 1. Run all migrations
    console.log('📦 Running migrations...');
    try {
      const migrations = await AppDataSource.runMigrations({ transaction: 'each' });
      if (migrations.length === 0) {
        console.log('  ⏭  All migrations already applied');
      } else {
        console.log(`  ✅ Applied ${migrations.length} migration(s):`);
        migrations.forEach(m => console.log(`     - ${m.name}`));
      }
    } catch (migErr: any) {
      // If tables already exist (database was recreated without migration history),
      // mark all migrations as run and continue
      if (migErr.message?.includes('Duplicate column') || migErr.message?.includes('already exists') || migErr.message?.includes("Table") ) {
        console.log('  ⚠️  Some migrations already applied (tables exist). Marking all as run...');
        try {
          // Create migrations table if not exists
          await AppDataSource.query(`
            CREATE TABLE IF NOT EXISTS migrations (
              id INT AUTO_INCREMENT PRIMARY KEY,
              timestamp BIGINT NOT NULL,
              name VARCHAR(255) NOT NULL
            )
          `);
          // Get all migration classes
          const allMigrations = AppDataSource.migrations;
          for (const migration of allMigrations) {
            const name = (migration as any).name || migration.constructor.name;
            const timestamp = parseInt(name.match(/\d+/)?.[0] || '0');
            const exists = await AppDataSource.query(
              `SELECT id FROM migrations WHERE name = ? LIMIT 1`, [name]
            );
            if (!exists || exists.length === 0) {
              await AppDataSource.query(
                `INSERT IGNORE INTO migrations (timestamp, name) VALUES (?, ?)`,
                [timestamp, name]
              );
            }
          }
          console.log(`  ✅ Marked ${allMigrations.length} migrations as applied`);
        } catch (markErr: any) {
          console.log(`  ⚠️  Could not mark migrations: ${markErr.message}`);
        }
      } else {
        throw migErr;
      }
    }
    console.log();

    // 2. Seed admin
    console.log('👤 Seeding admin account...');
    await seedAdmin(AppDataSource);
    console.log();

    // 3. Seed subscription plans
    console.log('💳 Seeding subscription plans...');
    await seedPlans(AppDataSource);
    console.log();

    // 4. Seed permissions
    console.log('🔐 Seeding permissions...');
    await seedPermissions(AppDataSource);
    console.log();

    // 5. Seed add-ons
    console.log('🧩 Seeding add-ons marketplace...');
    await seedAddOns(AppDataSource);
    console.log();

    // 6. Ensure email_configs table exists (may not be created if migration was skipped)
    console.log('📧 Ensuring email_configs table...');
    await ensureEmailConfigsTable(AppDataSource);
    console.log();

    await AppDataSource.destroy();

    console.log('═══════════════════════════════════════════');
    console.log('✅ Database setup complete!\n');
    console.log('🔑 Company Admin Login:');
    console.log('   URL      : http://localhost:4402');
    console.log('   Email    : admin@monetrapos.com');
    console.log('   Password : admin123\n');
    console.log('🌐 Member Admin (register new company):');
    console.log('   URL      : http://localhost:4403/register\n');
    console.log('📚 API Docs : http://localhost:4404/api/docs');
    console.log('═══════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Check DB_USERNAME and DB_PASSWORD in .env');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   → Database does not exist. Create it first:');
      console.error(`     CREATE DATABASE ${process.env.DB_DATABASE || 'monetrapos'};`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   → MySQL is not running. Start MySQL first.');
    }
    process.exit(1);
  }
}

main();
