"use client";

import { useState } from 'react';
import { QrCode, Banknote, Loader2, CheckCircle2 } from 'lucide-react';

export function PaymentsTab({ payments, onSave }: { payments: any[], onSave: (d: any) => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Assuming active payment config mapping logic here. For simplicity, we manage a single QRIS config
  const qrisConfig = payments.find(p => p.type === 'qris') || { name: 'QRIS Standard', type: 'qris', details: '', isActive: false };
  const [qrisPayload, setQrisPayload] = useState(qrisConfig.details?.payload || '');
  const [isQrisActive, setIsQrisActive] = useState(qrisConfig.isActive);

  const handleSaveQRIS = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await onSave({
        id: qrisConfig.id, // if editing
        name: 'QRIS Static',
        type: 'qris',
        isActive: isQrisActive,
        details: { payload: qrisPayload }
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      alert("Failed to update QRIS configuration");
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Payment Integration</h2>
        <p style={{ color: 'var(--text-tertiary)' }}>Activate Cash features or configure static QRIS payloads for the Mobile App.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        
        {/* Cash Wrapper */}
        <div style={{ padding: 'var(--space-lg)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '8px', borderRadius: '8px' }}><Banknote size={24} /></div>
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Cash Handling</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Default store collection</p>
              </div>
            </div>
            <span className="badge badge-success">Always Active</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cash transactions are recorded with exact change calculation directly on the POS mobile app.</p>
        </div>

        {/* QRIS Wrapper */}
        <div style={{ padding: 'var(--space-lg)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <form onSubmit={handleSaveQRIS}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '8px', borderRadius: '8px' }}><QrCode size={24} /></div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>QRIS Static Code</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>E-Wallet Processing</p>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" checked={isQrisActive} onChange={e => setIsQrisActive(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ marginLeft: '8px', fontSize: '0.9rem' }}>Enabled</span>
              </label>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              Paste your standard QRIS National string payload below. The POS app will generate the QR code reliably upon customer checkout.
            </p>

            <div className="form-group">
              <textarea 
                className="form-input" rows={4} 
                placeholder="00020101021126660016ID.CO.QRIS.WWW01189360091..." 
                value={qrisPayload} onChange={e => setQrisPayload(e.target.value)}
                disabled={!isQrisActive}
              />
            </div>
            
            <div className="flex-between" style={{ marginTop: 'var(--space-lg)' }}>
              {success ? (
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={16} /> Saved!
                </span>
              ) : <span/>}
              <button disabled={!isQrisActive || loading} type="submit" className="btn btn-outline" style={{ border: '1px solid #38bdf8', color: '#38bdf8' }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Payload'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
