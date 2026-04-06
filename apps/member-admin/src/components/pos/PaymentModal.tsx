'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, CreditCard, Smartphone, Building2, Wallet, QrCode, Loader2, RefreshCw } from 'lucide-react';
import { PaymentMethod, PaymentMethodType as PMType } from '@/types/payment-method.types';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

type PaymentMethodType = 'cash' | 'card' | 'transfer' | 'qris' | 'ewallet';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4404';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  storeId?: string;
  companyId?: string;
  paymentMethods?: PaymentMethod[];
  onConfirm: (paymentMethod: PaymentMethodType, paidAmount: number) => void;
}

// Default fallback — selalu tampil jika API tidak return data
const defaultPaymentMethods = [
  { id: 'default-cash',     type: 'cash' as PaymentMethodType,     label: 'Cash',         icon: Wallet,    color: '#10b981', iconUrl: undefined, requiresReference: false },
  { id: 'default-qris',     type: 'qris' as PaymentMethodType,     label: 'QRIS',         icon: QrCode,    color: '#6366f1', iconUrl: undefined, requiresReference: false },
  { id: 'default-card',     type: 'card' as PaymentMethodType,     label: 'EDC/Debit',    icon: CreditCard,color: '#3b82f6', iconUrl: undefined, requiresReference: true  },
  { id: 'default-transfer', type: 'transfer' as PaymentMethodType, label: 'Bank Transfer', icon: Building2, color: '#f59e0b', iconUrl: undefined, requiresReference: true  },
];

const getIconForType = (type: string) => {
  switch (type) {
    case PMType.CASH:         return Wallet;
    case PMType.CARD:         return CreditCard;
    case PMType.EWALLET:      return Smartphone;
    case PMType.BANK_TRANSFER:return Building2;
    case PMType.QRIS:         return QrCode;
    default:                  return CreditCard;
  }
};

const mapToPaymentType = (type: string): PaymentMethodType => {
  switch (type) {
    case PMType.CASH:         return 'cash';
    case PMType.CARD:         return 'card';
    case PMType.BANK_TRANSFER:return 'transfer';
    case PMType.QRIS:         return 'qris';
    case PMType.EWALLET:      return 'ewallet';
    default:                  return 'cash'; // fallback ke cash, bukan 'other' yang tidak ada di DB enum
  }
};

export default function PaymentModal({ isOpen, onClose, total, storeId, companyId, paymentMethods, onConfirm }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('cash');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  // Reset state setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setSelectedMethod('cash');
      setPaidAmount(String(Math.ceil(total)));
      setReferenceNumber('');
      setLoading(false);
      setQrDataUrl(null);
      setQrError(null);
    }
  }, [isOpen, total]);

  // Generate QRIS dinamis saat metode QRIS dipilih
  const fetchDynamicQris = useCallback(async () => {
    if (!total) return;
    setQrLoading(true);
    setQrError(null);
    setQrDataUrl(null);
    try {
      const res = await apiClient.post('/qris/generate-dynamic', {
        storeId: storeId || undefined,
        companyId: companyId || undefined,
        amount: Math.round(total),
      });
      const data = res.data as any;
      if (data.success && data.qrDataUrl) {
        setQrDataUrl(data.qrDataUrl);
      } else {
        setQrError(data.message || 'Gagal generate QRIS');
      }
    } catch (err: any) {
      setQrError(err?.response?.data?.message || 'Gagal menghubungi server');
    } finally {
      setQrLoading(false);
    }
  }, [storeId, companyId, total]);

  useEffect(() => {
    if (isOpen && selectedMethod === 'qris') {
      fetchDynamicQris();
    }
  }, [isOpen, selectedMethod, fetchDynamicQris]);

  if (!isOpen) return null;

  // Gunakan API methods jika ada, fallback ke default
  const methods = (paymentMethods && paymentMethods.length > 0)
    ? paymentMethods.map((m, idx) => ({
        id: m.id || `method-${idx}`,
        type: mapToPaymentType(m.type),
        label: m.name,
        icon: getIconForType(m.type),
        color: m.color || '#3b82f6',
        // Fix iconUrl — prefix dengan API base URL jika path relatif
        iconUrl: m.iconUrl
          ? (m.iconUrl.startsWith('http') ? m.iconUrl : `${API_BASE}${m.iconUrl}`)
          : undefined,
        requiresReference: m.requiresReference ?? false,
      }))
    : defaultPaymentMethods;

  const paid = parseFloat(paidAmount) || 0;
  const change = Math.max(0, paid - total);
  const selectedMethodData = methods.find(m => m.type === selectedMethod) ?? methods[0];
  const requiresReference = selectedMethodData?.requiresReference ?? false;
  const isCash = selectedMethod === 'cash';

  const handleConfirm = async () => {
    if (isCash && paid < total) {
      toast.error('Jumlah bayar kurang dari total');
      return;
    }
    if (requiresReference && !referenceNumber.trim()) {
      toast.error('Masukkan nomor referensi');
      return;
    }
    setLoading(true);
    try {
      await onConfirm(selectedMethod, isCash ? paid : total);
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Pembayaran gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Quick cash amounts
  const quickAmounts = [...new Set([
    Math.ceil(total),
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 50000) * 50000,
    Math.ceil(total / 100000) * 100000,
  ])].filter(v => v >= total).slice(0, 4);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary, #fff)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',          // ← batasi tinggi
          display: 'flex',
          flexDirection: 'column',    // ← header + scroll content + footer
        }}
      >
        {/* ── Header (fixed) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-color, #e5e7eb)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Pembayaran</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #6b7280)', margin: '2px 0 0' }}>
              Total: <strong style={{ color: 'var(--success, #10b981)', fontSize: '1.1rem' }}>Rp {Number(total).toLocaleString('id-ID')}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary, #9ca3af)', padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Metode Pembayaran */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary, #111827)' }}>
              Metode Pembayaran
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {methods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.type;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.type)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '8px',
                      border: `2px solid ${isSelected ? (method.color || '#3b82f6') : 'var(--border-color, #e5e7eb)'}`,
                      background: isSelected ? `${method.color || '#3b82f6'}15` : 'var(--bg-tertiary, #f9fafb)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                  >
                    {method.iconUrl ? (
                      <img src={method.iconUrl} alt={method.label} style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} />
                    ) : (
                      <Icon size={22} style={{ color: isSelected ? (method.color || '#3b82f6') : 'var(--text-tertiary, #9ca3af)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: '0.875rem', fontWeight: isSelected ? 600 : 400, color: isSelected ? (method.color || '#3b82f6') : 'var(--text-primary, #111827)' }}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input jumlah bayar — hanya untuk Cash */}
          {isCash && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary, #111827)' }}>
                Jumlah Bayar (Rp)
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', fontSize: '1.25rem', fontWeight: 700,
                  border: '2px solid var(--border-color, #e5e7eb)', borderRadius: '8px',
                  outline: 'none', boxSizing: 'border-box',
                  color: 'var(--text-primary, #111827)', background: 'var(--bg-primary, #fff)',
                }}
                placeholder="0"
                min={total}
                autoFocus
              />

              {/* Quick amounts */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${quickAmounts.length}, 1fr)`, gap: '6px', marginTop: '8px' }}>
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    onClick={() => setPaidAmount(String(amount))}
                    style={{
                      padding: '8px 4px', fontSize: '0.8rem', fontWeight: 500,
                      background: 'var(--bg-tertiary, #f3f4f6)', border: '1px solid var(--border-color, #e5e7eb)',
                      borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary, #111827)',
                    }}
                  >
                    {amount.toLocaleString('id-ID')}
                  </button>
                ))}
              </div>

              {/* Kembalian */}
              {paid >= total && (
                <div style={{ marginTop: '12px', padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: '#065f46' }}>Kembalian</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
                    Rp {change.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Nomor referensi — untuk metode yang butuh */}
          {requiresReference && !isCash && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary, #111827)' }}>
                Nomor Referensi *
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', fontSize: '1rem',
                  border: '2px solid var(--border-color, #e5e7eb)', borderRadius: '8px',
                  outline: 'none', boxSizing: 'border-box',
                  color: 'var(--text-primary, #111827)', background: 'var(--bg-primary, #fff)',
                }}
                placeholder="Kode approval / nomor referensi transaksi"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary, #9ca3af)', marginTop: '4px' }}>
                Masukkan kode approval kartu, referensi transfer, atau ID transaksi
              </p>
            </div>
          )}

          {/* Info non-cash */}
          {!isCash && !requiresReference && selectedMethod !== 'qris' && (
            <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', fontSize: '0.875rem', color: '#4338ca' }}>
              Pastikan pembayaran sebesar <strong>Rp {Number(total).toLocaleString('id-ID')}</strong> sudah diterima sebelum konfirmasi.
            </div>
          )}

          {/* QRIS — tampilkan QR dinamis dengan nominal */}
          {selectedMethod === 'qris' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              {/* Nominal tagihan */}
              <div style={{ width: '100%', padding: '12px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#4338ca', marginBottom: '4px' }}>Nominal Tagihan</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4338ca' }}>
                  Rp {Number(total).toLocaleString('id-ID')}
                </div>
              </div>

              {/* QR Code area */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                {qrLoading ? (
                  <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-tertiary, #9ca3af)' }}>
                    <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
                    <span style={{ fontSize: '0.85rem' }}>Generating QRIS...</span>
                  </div>
                ) : qrDataUrl ? (
                  <>
                    <img
                      src={qrDataUrl}
                      alt="QRIS Dinamis"
                      style={{ width: '240px', height: '240px', borderRadius: '8px', border: '3px solid rgba(99,102,241,0.3)' }}
                    />
                    <button
                      onClick={fetchDynamicQris}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: '0.8rem', padding: '4px 8px' }}
                    >
                      <RefreshCw size={14} /> Refresh QR
                    </button>
                  </>
                ) : qrError ? (
                  <div style={{ width: '100%', padding: '16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                    <QrCode size={40} style={{ color: '#ef4444', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '0.85rem', color: '#dc2626', margin: '0 0 8px' }}>{qrError}</p>
                    {qrError.includes('string') && (
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                        Buka Settings → Payment Methods → QRIS → Upload gambar QRIS dan pastikan QR string tersimpan
                      </p>
                    )}
                    <button onClick={fetchDynamicQris} style={{ marginTop: '8px', padding: '6px 14px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Coba Lagi
                    </button>
                  </div>
                ) : null}
              </div>

              <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: '#065f46', width: '100%', textAlign: 'center' }}>
                QR sudah include nominal <strong>Rp {Number(total).toLocaleString('id-ID')}</strong> — pelanggan tinggal scan & bayar
              </div>
            </div>
          )}
        </div>

        {/* ── Footer (fixed) ── */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color, #e5e7eb)', display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color, #e5e7eb)', background: 'var(--bg-tertiary, #f3f4f6)', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary, #111827)' }}
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (isCash && paid < total)}
            style={{
              flex: 2, padding: '12px', borderRadius: '8px', border: 'none',
              background: loading || (isCash && paid < total) ? '#9ca3af' : '#4f46e5',
              color: 'white', cursor: loading || (isCash && paid < total) ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '1rem',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Memproses...' : `Bayar Rp ${Number(total).toLocaleString('id-ID')}`}
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}
