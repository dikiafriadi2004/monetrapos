'use client';

import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, Zap, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api-client';

export default function PaymentGatewaySettingsPage() {
  const [status, setStatus] = useState<{ xendit: { enabled: boolean; isProduction: boolean } } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/admin/payment-gateway/status')
      .then(r => setStatus(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );

  const xenditEnabled = status?.xendit?.enabled;

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Payment Gateway</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Status payment gateway yang digunakan untuk pembayaran subscription</p>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--space-xl)', maxWidth: 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: xenditEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {xenditEnabled ? <CheckCircle size={26} color="var(--success)" /> : <Zap size={26} color="var(--danger)" />}
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 2 }}>Xendit</h3>
            <span style={{ fontSize: '0.85rem', padding: '2px 10px', borderRadius: 20, fontWeight: 600, background: xenditEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: xenditEnabled ? 'var(--success)' : 'var(--danger)' }}>
              {xenditEnabled ? (status?.xendit?.isProduction ? '🔴 Production' : '🟡 Test Mode') : 'Belum Dikonfigurasi'}
            </span>
          </div>
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {xenditEnabled
            ? 'Xendit aktif dan siap memproses pembayaran. Pembayaran subscription akan otomatis diarahkan ke halaman Xendit.'
            : 'Xendit belum dikonfigurasi. Hubungi administrator platform untuk mengaktifkan payment gateway.'}
        </div>

        {!xenditEnabled && (
          <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.85rem', color: '#92400e' }}>
            ⚠️ Tanpa payment gateway aktif, pembayaran harus dilakukan secara manual. Hubungi support untuk informasi lebih lanjut.
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}
