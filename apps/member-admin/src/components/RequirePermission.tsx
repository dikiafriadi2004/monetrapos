'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/contexts/AuthContext';

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
}

/**
 * Komponen untuk melindungi halaman berdasarkan permission.
 * Jika user tidak punya permission, redirect ke dashboard dengan pesan error.
 *
 * Contoh penggunaan di page.tsx:
 * export default function ProductsPage() {
 *   return (
 *     <RequirePermission permission="product.view">
 *       <ProductsContent />
 *     </RequirePermission>
 *   );
 * }
 */
export default function RequirePermission({ permission, children }: RequirePermissionProps) {
  const router = useRouter();
  const { isLoading } = useAuth();
  const { hasPermission } = usePermission();

  const allowed = hasPermission(permission);

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.replace('/dashboard?error=forbidden');
    }
  }, [isLoading, allowed, router]);

  if (isLoading) return null;

  if (!allowed) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Akses Ditolak
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 360 }}>
          Anda tidak memiliki izin untuk mengakses halaman ini.
          Hubungi administrator untuk mendapatkan akses.
        </p>
        <button onClick={() => router.push('/dashboard')} className="btn btn-primary">
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
