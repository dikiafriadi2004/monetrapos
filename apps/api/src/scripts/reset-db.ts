/**
 * Reset Database Script
 * Drops all tables and recreates them via TypeORM synchronize
 * Then runs seeders for initial data
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/reset-db.ts
 */
import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

import { DataSource } from 'typeorm';

// Import all entities
import { Company } from '../modules/companies/company.entity';
import { User } from '../modules/users/user.entity';
import { Store } from '../modules/stores/store.entity';
import { Role } from '../modules/roles/role.entity';
import { Permission } from '../modules/roles/permission.entity';
import { Employee } from '../modules/employees/employee.entity';
import { EmployeeAttendance } from '../modules/employees/employee-attendance.entity';
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
import { SubscriptionPlan } from '../modules/subscriptions/subscription-plan.entity';
import { SubscriptionDuration } from '../modules/subscriptions/subscription-duration.entity';
import { Subscription } from '../modules/subscriptions/subscription.entity';
import { SubscriptionHistory } from '../modules/subscriptions/subscription-history.entity';
import { Invoice } from '../modules/billing/invoice.entity';
import { PaymentTransaction } from '../modules/billing/payment-transaction.entity';
import { UsageTracking } from '../modules/usage/usage-tracking.entity';
import { EmailVerificationToken } from '../modules/auth/email-verification-token.entity';
import { PasswordResetToken } from '../modules/auth/password-reset-token.entity';
import { Notification } from '../modules/notifications/notification.entity';
import { AuditLog } from '../modules/audit/audit-log.entity';
import { Customer } from '../modules/customers/customer.entity';
import { LoyaltyPointTransaction } from '../modules/customers/loyalty-point-transaction.entity';
import { Inventory } from '../modules/inventory/inventory.entity';
import { StockMovement } from '../modules/inventory/stock-movement.entity';
import { StockOpname, StockOpnameItem } from '../modules/inventory/stock-opname.entity';
import { AddOn } from '../modules/add-ons/add-on.entity';
import { CompanyAddOn } from '../modules/add-ons/company-add-on.entity';
import { Supplier } from '../modules/suppliers/supplier.entity';
import { PurchaseOrder, PurchaseOrderItem } from '../modules/purchase-orders/purchase-order.entity';
import { Table } from '../modules/fnb/table.entity';
import { FnbOrder } from '../modules/fnb/fnb-order.entity';
import { FnbModifierGroup, FnbModifierOption } from '../modules/fnb/fnb-modifier.entity';
import { LaundryServiceType } from '../modules/laundry/laundry-service-type.entity';
import { LaundryOrder } from '../modules/laundry/laundry-order.entity';
import { LaundryItem } from '../modules/laundry/laundry-item.entity';
import { PaymentGatewayConfig } from '../modules/payment-gateway/payment-gateway-config.entity';
import { LandingContent } from '../modules/landing/landing-content.entity';
import { EmailConfig } from '../modules/email/email-config.entity';
import { AdminUser } from '../modules/admin-auth/admin-user.entity';
import { PaymentWebhook } from '../modules/billing/payment-webhook.entity';

const entities = [
  Company, User, Store, Role, Permission, Employee, EmployeeAttendance,
  Product, Category, ProductVariant, Tax, Discount, DiscountUsage,
  PaymentMethod, QrisConfig, CompanyPaymentMethod,
  Transaction, TransactionItem,
  Feature, SubscriptionPlan, SubscriptionDuration, Subscription, SubscriptionHistory,
  Invoice, PaymentTransaction, UsageTracking,
  EmailVerificationToken, PasswordResetToken,
  Notification, AuditLog,
  Customer, LoyaltyPointTransaction,
  Inventory, StockMovement, StockOpname, StockOpnameItem,
  AddOn, CompanyAddOn, Supplier, PurchaseOrder, PurchaseOrderItem,
  Table, FnbOrder, FnbModifierGroup, FnbModifierOption,
  LaundryServiceType, LaundryOrder, LaundryItem,
  PaymentGatewayConfig, LandingContent, EmailConfig, AdminUser, PaymentWebhook,
];

async function resetDatabase() {
  console.log('🔄 Connecting to database...');

  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'monetrapos',
    entities,
    synchronize: false,
    logging: false,
  });

  await ds.initialize();
  console.log('✅ Connected');

  // Drop all tables
  console.log('🗑️  Dropping all tables...');
  await ds.dropDatabase();
  console.log('✅ All tables dropped');

  // Recreate via synchronize
  console.log('🏗️  Creating tables via synchronize...');
  await ds.synchronize();
  console.log('✅ Tables created');

  await ds.destroy();
  console.log('✅ Database reset complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Restart the API server (it will auto-seed on startup)');
  console.log('  2. The seeder will create: admin user, subscription plans, features, add-ons');
}

resetDatabase().catch(err => {
  console.error('❌ Reset failed:', err.message);
  process.exit(1);
});
