'use client';

import { useState } from 'react';
import { X, Percent, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface ItemDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  itemPrice: number;
  itemQuantity: number;
  onApply: (discountAmount: number, discountType: 'percentage' | 'fixed', discountValue: number) => void;
}

export default function ItemDiscountModal({ isOpen, onClose, itemName, itemPrice, itemQuantity, onApply }: ItemDiscountModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');

  if (!isOpen) return null;

  const itemSubtotal = Number(itemPrice) * itemQuantity;
  const value = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'percentage' ? (itemSubtotal * value) / 100 : value;
  const finalPrice = itemSubtotal - discountAmount;

  const handleApply = () => {
    if (value <= 0) { toast.error('Masukkan nilai diskon yang valid'); return; }
    if (discountType === 'percentage' && value > 100) { toast.error('Diskon persentase tidak boleh melebihi 100%'); return; }
    if (discountType === 'fixed' && value > itemSubtotal) { toast.error('Diskon tidak boleh melebihi subtotal item'); return; }
    onApply(discountAmount, discountType, value);
    onClose();
    setDiscountValue('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}>
      <div style={{ background: 'var(--bg-secondary, #fff)', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.25)', width: '100%', maxWidth: 440, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e5e7eb)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Diskon Item</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><X size={20} /></button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Item Info */}
          <div style={{ background: '#f3f4f6', padding: '12px 16px', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{itemName}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.875rem', color: '#6b7280' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Qty</span><span>{itemQuantity}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Harga</span><span>Rp {Number(itemPrice).toLocaleString('id-ID')}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#111827', borderTop: '1px solid #e5e7eb', paddingTop: 6, marginTop: 2 }}>
                <span>Subtotal</span><span>Rp {itemSubtotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Tipe Diskon */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 8 }}>Tipe Diskon</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { type: 'percentage' as const, label: 'Persentase', icon: Percent },
                { type: 'fixed' as const, label: 'Nominal Tetap', icon: DollarSign },
              ].map(({ type, label, icon: Icon }) => (
                <button key={type} onClick={() => setDiscountType(type)} style={{ padding: '12px 8px', borderRadius: 8, border: `2px solid ${discountType === type ? '#3b82f6' : '#e5e7eb'}`, background: discountType === type ? '#eff6ff' : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
                  <Icon size={22} style={{ color: discountType === type ? '#3b82f6' : '#9ca3af' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: discountType === type ? '#3b82f6' : '#374151' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}>
              {discountType === 'percentage' ? 'Persentase (%)' : 'Nominal (Rp)'}
            </label>
            <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', fontSize: '1.1rem', border: '2px solid #e5e7eb', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
              placeholder={discountType === 'percentage' ? 'Contoh: 10' : 'Contoh: 5000'} autoFocus />
            {discountType === 'percentage' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                {[5, 10, 15, 20].map(p => (
                  <button key={p} onClick={() => setDiscountValue(String(p))} style={{ padding: '6px 4px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>{p}%</button>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {value > 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: '#6b7280' }}>Diskon</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>-Rp {discountAmount.toLocaleString('id-ID')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, borderTop: '1px solid #bbf7d0', paddingTop: 8 }}>
                <span>Harga Akhir</span>
                <span style={{ color: '#16a34a' }}>Rp {finalPrice.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border-color, #e5e7eb)', background: '#f9fafb', borderRadius: '0 0 12px 12px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Batal</button>
          <button onClick={handleApply} disabled={value <= 0} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: value <= 0 ? '#9ca3af' : '#3b82f6', color: '#fff', cursor: value <= 0 ? 'not-allowed' : 'pointer', fontWeight: 700 }}>Terapkan Diskon</button>
        </div>
      </div>
    </div>
  );
}
