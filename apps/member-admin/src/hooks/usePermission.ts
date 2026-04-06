import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook untuk mengecek permission user.
 *
 * Logika:
 * - member dengan role owner → semua permission granted
 * - member (non-owner, e.g. admin/manager/accountant) → semua permission granted
 * - employee → hanya permission yang ada di user.permissions[]
 */
export function usePermission() {
  const { user } = useAuth();

  /**
   * Cek apakah user punya permission tertentu
   */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Owner role punya semua akses ke semua fitur member-admin
    if (user.role === 'owner') return true;

    // Non-owner members (admin, manager, accountant) punya akses penuh ke member-admin
    if (user.type === 'member') return true;

    // Employee harus punya permission spesifik
    return user.permissions?.includes(permission) ?? false;
  };

  /**
   * Cek apakah user punya salah satu dari beberapa permission
   */
  const hasAnyPermission = (...permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  /**
   * Cek apakah user punya semua permission yang diberikan
   */
  const hasAllPermissions = (...permissions: string[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };

  /**
   * Apakah user adalah member (pemilik bisnis)
   */
  const isMember = user?.type === 'member';

  /**
   * Apakah user adalah employee
   */
  const isEmployee = user?.type === 'employee';

  /**
   * Apakah user adalah owner atau admin (full access)
   * Owner: semua permission
   * Admin: hampir semua permission kecuali subscription management
   */
  const isOwnerOrAdmin =
    user?.role === 'owner' || user?.role === 'admin';

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isMember,
    isEmployee,
    isOwnerOrAdmin,
    userType: user?.type,
    userRole: user?.role,
    permissions: user?.permissions ?? [],
  };
}

// Konstanta semua permission codes — sinkron dengan permission.seeder.ts
export const PERMISSIONS = {
  // POS
  POS_CREATE: 'pos.create_transaction',
  POS_VOID: 'pos.void_transaction',
  POS_REFUND: 'pos.refund',
  POS_DISCOUNT: 'pos.apply_discount',
  POS_VIEW_CART: 'pos.view_cart',

  // Products
  PRODUCT_VIEW: 'product.view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_EDIT: 'product.edit',
  PRODUCT_DELETE: 'product.delete',
  PRODUCT_STOCK: 'product.manage_stock',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',
  INVENTORY_OPNAME: 'inventory.opname',

  // Employees
  EMPLOYEE_VIEW: 'employee.view',
  EMPLOYEE_CREATE: 'employee.create',
  EMPLOYEE_EDIT: 'employee.edit',
  EMPLOYEE_DELETE: 'employee.delete',
  EMPLOYEE_MANAGE_ROLE: 'employee.manage_role',
  EMPLOYEE_MANAGE_SHIFT: 'employee.manage_shift',
  EMPLOYEE_CLOCK: 'employee.clock_in_out',

  // Finance
  FINANCE_REPORTS: 'finance.view_reports',
  FINANCE_TRANSACTIONS: 'finance.view_transactions',
  FINANCE_EXPORT: 'finance.export_data',
  FINANCE_TAX: 'finance.manage_tax',
  FINANCE_DISCOUNT: 'finance.manage_discount',
  FINANCE_PAYMENT: 'finance.manage_payment',
  FINANCE_EXPENSES: 'finance.manage_expenses',

  // Stores
  STORE_VIEW: 'store.view',
  STORE_CREATE: 'store.create',
  STORE_EDIT: 'store.edit',
  STORE_DELETE: 'store.delete',

  // Settings
  SETTINGS_STORE: 'settings.store_profile',
  SETTINGS_RECEIPT: 'settings.receipt_template',
  SETTINGS_TABLE: 'settings.manage_table',
  SETTINGS_PRINTER: 'settings.manage_printer',
  SETTINGS_SUBSCRIPTION: 'settings.subscription',

  // Customers
  CUSTOMER_VIEW: 'customer.view',
  CUSTOMER_CREATE: 'customer.create',
  CUSTOMER_EDIT: 'customer.edit',
  CUSTOMER_LOYALTY: 'customer.manage_loyalty',

  // Kitchen
  KITCHEN_VIEW: 'kitchen.view_orders',
  KITCHEN_UPDATE: 'kitchen.update_status',

  // Laundry
  LAUNDRY_VIEW: 'laundry.view_orders',
  LAUNDRY_UPDATE: 'laundry.update_status',
} as const;
