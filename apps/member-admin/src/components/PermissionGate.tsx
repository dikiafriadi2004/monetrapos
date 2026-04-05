'use client';

import { usePermission } from '@/hooks/usePermission';

interface PermissionGateProps {
  /** Permission code yang dibutuhkan, e.g. 'product.create' */
  permission?: string;
  /** Beberapa permission — cukup salah satu */
  anyOf?: string[];
  /** Beberapa permission — harus semua ada */
  allOf?: string[];
  /** Konten yang ditampilkan jika tidak punya permission */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Komponen untuk menyembunyikan UI berdasarkan permission.
 *
 * Contoh:
 * <PermissionGate permission="product.create">
 *   <button>Add Product</button>
 * </PermissionGate>
 *
 * <PermissionGate anyOf={['product.edit', 'product.delete']}>
 *   <ActionButtons />
 * </PermissionGate>
 */
export default function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  let allowed = true;

  if (permission) {
    allowed = hasPermission(permission);
  } else if (anyOf && anyOf.length > 0) {
    allowed = hasAnyPermission(...anyOf);
  } else if (allOf && allOf.length > 0) {
    allowed = hasAllPermissions(...allOf);
  }

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
