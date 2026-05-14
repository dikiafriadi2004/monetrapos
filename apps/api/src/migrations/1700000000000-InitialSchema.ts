import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initial schema migration.
 * Creates all tables for a fresh deployment (VPS/production).
 * Run: npm run migration:run
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));
    for (const statement of statements) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'role_permissions', 'stock_opname_items', 'purchase_order_items', 'transaction_items',
      'laundry_items', 'fnb_modifier_options', 'fnb_orders', 'tables', 'laundry_orders',
      'laundry_service_types', 'fnb_modifier_groups', 'stock_opnames', 'stock_movements',
      'discount_usages', 'discounts', 'audit_logs', 'notifications', 'shifts', 'transactions',
      'purchase_orders', 'suppliers', 'company_add_ons', 'add_ons', 'payment_transactions',
      'invoices', 'subscription_history', 'subscription_durations', 'subscriptions',
      'subscription_plans', 'usage_tracking', 'store_payment_methods', 'payment_methods',
      'payment_gateway_configs', 'qris_configs', 'email_verification_tokens',
      'password_reset_tokens', 'email_configs', 'landing_contents', 'features',
      'customers', 'product_variants', 'products', 'categories', 'taxes', 'roles',
      'permissions', 'employees', 'stores', 'users', 'admin_users', 'companies',
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}
