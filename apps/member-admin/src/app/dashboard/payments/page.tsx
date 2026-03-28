"use client";

import { useState, useEffect, useRef } from 'react';
import { Wallet, QrCode, Banknote, Building2, ToggleLeft, ToggleRight, Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import { api } from '../../../lib/api';

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  config?: any;
}

interface QrisConfig {
  id?: string;
  merchantName?: string;
  qrisImageUrl?: string;
}

export default function PaymentSettingsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [qrisConfig, setQrisConfig] = useState<QrisConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', accountHolder: '' });
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [methodsData, qrisData]: any = await Promise.all([
        api.get('/payments/methods').catch(() => []),
        api.get('/payments/qris-config').catch(() => null),
      ]);
      setMethods(Array.isArray(methodsData) ? methodsData : []);
      setQrisConfig(qrisData || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleMethod = async (method: PaymentMethod) => {
    try {
      await api.patch(`/payments/methods/${method.id}`, { isActive: !method.isActive });
      setMethods(prev => prev.map(m => m.id === method.id ? { ...m, isActive: !m.isActive } : m));
    } catch { alert('Failed to update payment method'); }
  };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('qrisImage', file);
      await api.post('/payments/qris-config/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchData();
    } catch {
      alert('Failed to upload QRIS image');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBankTransfer = async () => {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolder) return;
    setSubmitting(true);
    try {
      await api.post('/payments/methods', {
        name: 'Bank Transfer',
        type: 'transfer',
        isActive: true,
        config: bankForm
      });
      await fetchData();
      setShowBankModal(false);
    } catch { alert('Failed to save bank transfer settings'); }
    finally { setSubmitting(false); }
  };

  const cashMethod = methods.find(m => m.type === 'cash');
  const qrisMethod = methods.find(m => m.type === 'qris');
  const transferMethod = methods.find(m => m.type === 'transfer');

  const PaymentCard = ({ icon: Icon, title, description, method, children, accent }: {
    icon: any; title: string; description: string; method?: PaymentMethod; children?: React.ReactNode; accent: string;
  }) => (
    <div className="glass-panel" style={{ padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: `${accent}20`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>{title}</h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{description}</p>
          </div>
        </div>
        {method && (
          <button onClick={() => handleToggleMethod(method)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: method.isActive ? 'var(--success)' : 'var(--text-tertiary)', transition: 'color var(--transition-fast)' }}>
            {method.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        )}
      </div>
      {children}
      <div style={{ position: 'absolute', right: '-5%', bottom: '-10%', width: '80px', height: '80px', background: accent, filter: 'blur(50px)', opacity: 0.08, zIndex: -1 }} />
    </div>
  );

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading payment settings...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Payment Methods</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure how your store accepts payments.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>
            <CheckCircle size={12} style={{ marginRight: '4px' }} />
            {methods.filter(m => m.isActive).length} Active
          </span>
        </div>
      </div>

      {/* Payment Method Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        
        {/* Cash */}
        <PaymentCard icon={Banknote} title="Cash Payment" description="Accept cash with automatic change calculation" method={cashMethod} accent="var(--success)">
          <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-xs)' }}>
              <span>Auto-calculate change</span>
              <CheckCircle size={16} style={{ color: 'var(--success)' }} />
            </div>
            <div className="flex-between">
              <span>Cash drawer integration</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>POS App</span>
            </div>
          </div>
        </PaymentCard>

        {/* QRIS */}
        <PaymentCard icon={QrCode} title="QRIS Payment" description="Dynamic QR code payment for all e-wallets" method={qrisMethod} accent="var(--accent-base)">
          <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
                {qrisConfig?.qrisImageUrl ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="flex-center" style={{ marginBottom: 'var(--space-sm)' }}>
                      <CheckCircle size={16} style={{ color: 'var(--success)', marginRight: '6px' }} />
                      <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>QRIS Configured</span>
                    </div>
                    {qrisConfig.merchantName && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Merchant: {qrisConfig.merchantName}</p>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <AlertCircle size={20} style={{ color: 'var(--warning)', marginBottom: '6px' }} />
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No QRIS image uploaded</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleQrisUpload} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} className="btn btn-outline" style={{ width: '100%' }} disabled={uploading}>
                <Upload size={16} /> {uploading ? 'Uploading...' : qrisConfig?.qrisImageUrl ? 'Replace QRIS Image' : 'Upload QRIS Image'}
              </button>
            </div>
            <div style={{ flex: 1, padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <p style={{ marginBottom: 'var(--space-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>How it works:</p>
              <ol style={{ paddingLeft: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Upload your static QRIS image</li>
                <li>System extracts merchant data</li>
                <li>Dynamic QR generated per transaction</li>
                <li>Customer scans & pays with any e-wallet</li>
              </ol>
            </div>
          </div>
        </PaymentCard>

        {/* Bank Transfer */}
        <PaymentCard icon={Building2} title="Bank Transfer" description="Manual bank transfer with confirmation" method={transferMethod} accent="var(--warning)">
          <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            {transferMethod?.config ? (
              <div style={{ fontSize: '0.85rem' }}>
                <div className="flex-between" style={{ marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Bank</span>
                  <span style={{ fontWeight: 500 }}>{transferMethod.config.bankName}</span>
                </div>
                <div className="flex-between" style={{ marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Account No.</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{transferMethod.config.accountNumber}</span>
                </div>
                <div className="flex-between">
                  <span style={{ color: 'var(--text-tertiary)' }}>Account Name</span>
                  <span style={{ fontWeight: 500 }}>{transferMethod.config.accountHolder}</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: 'var(--space-sm)' }}>
                No bank account configured
              </div>
            )}
          </div>
          <button onClick={() => { 
            setBankForm(transferMethod?.config || { bankName: '', accountNumber: '', accountHolder: '' }); 
            setShowBankModal(true); 
          }} className="btn btn-outline" style={{ width: '100%', marginTop: 'var(--space-md)' }}>
            {transferMethod?.config ? 'Edit Bank Details' : 'Setup Bank Transfer'}
          </button>
        </PaymentCard>
      </div>

      {/* Bank Transfer Modal */}
      {showBankModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowBankModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: '450px', maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Bank Transfer Settings</h3>
              <button onClick={() => setShowBankModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Bank Name *</label>
              <input className="form-input" placeholder="e.g. BCA, Mandiri, BNI" value={bankForm.bankName} onChange={e => setBankForm(p => ({ ...p, bankName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number *</label>
              <input className="form-input" placeholder="1234567890" value={bankForm.accountNumber} onChange={e => setBankForm(p => ({ ...p, accountNumber: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Account Holder Name *</label>
              <input className="form-input" placeholder="PT Usaha Bersama" value={bankForm.accountHolder} onChange={e => setBankForm(p => ({ ...p, accountHolder: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setShowBankModal(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleSaveBankTransfer} className="btn btn-primary" style={{ background: 'var(--success)' }} disabled={submitting || !bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolder}>
                {submitting ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
