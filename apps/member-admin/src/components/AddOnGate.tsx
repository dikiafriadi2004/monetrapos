'use client';

import { useRouter } from 'next/navigation';
import { Lock, Zap } from 'lucide-react';
import { useAddOns } from '@/hooks/useAddOns';

interface AddOnGateProps {
  slug: string;
  featureName: string;
  description?: string;
  children: React.ReactNode;
  /** Jika true, render null saat tidak punya add-on (tidak tampilkan upsell) */
  silent?: boolean;
}

/**
 * Wrapper yang hanya render children jika company punya add-on aktif.
 * Jika tidak, tampilkan upsell card.
 */
export default function AddOnGate({ slug, featureName, description, children, silent = false }: AddOnGateProps) {
  const { hasAddOn, loading } = useAddOns();
  const router = useRouter();

  if (loading) return null;

  if (hasAddOn(slug)) {
    return <>{children}</>;
  }

  if (silent) return null;

  return (
    <div style={{
      padding: 'var(--space-2xl)',
      textAlign: 'center',
      border: '2px dashed var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      background: 'rgba(99,102,241,0.03)',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'rgba(99,102,241,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto var(--space-md)',
      }}>
        <Lock size={24} style={{ color: 'var(--primary)' }} />
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
        {featureName}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)', maxWidth: 400, margin: '0 auto var(--space-lg)' }}>
        {description || `Fitur ini membutuhkan add-on "${featureName}" yang aktif.`}
      </p>
      <button
        onClick={() => router.push('/dashboard/add-ons')}
        className="btn btn-primary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        <Zap size={16} /> Aktifkan Add-on
      </button>
    </div>
  );
}
