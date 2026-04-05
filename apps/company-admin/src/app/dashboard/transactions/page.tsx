"use client";

import { useState, useEffect } from 'react';
import { Receipt, TrendingUp, Search, CheckCircle, RefreshCcw, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../components/ConfirmModal';

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  paymentMethod?: string;
  companyId: string;
  company?: { name: string };
  createdAt: string;
  paidAt?: string;
  subscriptionId?: string;
}

export default function TransactionsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [verifyConfirm, setVerifyConfirm] = useState<{ open: boolean; invoice: Invoice | null }>({ open: false, invoice: null });
  const [verifying, setVerifying] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/billing/admin/invoices');
      setInvoices(Array.isArray(data) ? data : (data?.data || []));
    } catch (err) {
      console.error('Failed to fetch invoices', err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleVerifyPayment = async () => {
    if (!verifyConfirm.invoice) return;
    setVerifying(true);
    try {
      const res: any = await api.post('/payment-gateway/admin/verify-payment', {
        invoiceNumber: verifyConfirm.invoice.invoiceNumber,
      });
      if (res.success) {
        toast.success(res.message || 'Pembayaran diverifikasi dan subscription diaktifkan!');
        setVerifyConfirm({ open: false, invoice: null });
        fetchInvoices();
      } else {
        toast.error(res.message || 'Verifikasi gagal');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Verifikasi gagal');
    } finally {
      setVerifying(false);
    }
  };

  const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = !searchQuery ||
      inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.company?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => i.status === 'pending').length,
    revenue: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0),
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { paid: 'badge-success', pending: 'badge-warning', failed: 'badge-danger', cancelled: 'badge-danger' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Invoice & Pembayaran</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor semua invoice subscription member.</p>
        </div>
        <button onClick={fetchInvoices} className="btn btn-outline">
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: 'var(--space-xl)' }}>
        {[
          { label: 'Total Invoice', value: stats.total, icon: Receipt, color: 'var(--accent-base)' },
          { label: 'Lunas', value: stats.paid, icon: CheckCircle, color: 'var(--success)' },
          { label: 'Pending', value: stats.pending, icon: AlertCircle, color: 'var(--warning)' },
          { label: 'Total Revenue', value: fmt(stats.revenue), icon: TrendingUp, color: '#ec4899' },
        ].map((s, i) => (
          <div key={i} className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: `${s.color}20`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
              <s.icon size={18} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '2px' }}>{s.value}</h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="flex-between" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder="Cari invoice atau member..." className="form-input" style={{ paddingLeft: '36px', height: '36px' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {['all', 'pending', 'paid', 'failed'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-outline'}`} style={{ height: '36px', padding: '0 12px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                {s === 'all' ? 'Semua' : s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex-center" style={{ height: '250px', flexDirection: 'column' }}>
            <Receipt size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Tidak ada invoice ditemukan</p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              <div style={{ flex: 1.5 }}>Invoice</div>
              <div style={{ flex: 2 }}>Member / Company</div>
              <div style={{ flex: 1 }}>Amount</div>
              <div style={{ flex: 0.8 }}>Status</div>
              <div style={{ flex: 1 }}>Tanggal</div>
              <div style={{ width: '120px' }}>Aksi</div>
            </div>
            {filtered.map(inv => (
              <div key={inv.id} className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ flex: 1.5 }}>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--accent-base)', fontSize: '0.9rem' }}>{inv.invoiceNumber}</div>
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{inv.company?.name || '—'}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(Number(inv.total))}</div>
                </div>
                <div style={{ flex: 0.8 }}>{statusBadge(inv.status)}</div>
                <div style={{ flex: 1, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{fmtDate(inv.createdAt)}</div>
                <div style={{ width: '120px', display: 'flex', gap: '6px' }}>
                  {inv.status === 'pending' && (
                    <button onClick={() => setVerifyConfirm({ open: true, invoice: inv })} className="btn btn-success btn-sm" style={{ fontSize: '0.75rem' }}>
                      <CheckCircle size={13} /> Verifikasi
                    </button>
                  )}
                  {inv.status === 'paid' && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> Lunas
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={verifyConfirm.open}
        title="Verifikasi Pembayaran Manual"
        description={`Konfirmasi bahwa invoice "${verifyConfirm.invoice?.invoiceNumber}" (${fmt(Number(verifyConfirm.invoice?.total || 0))}) sudah dibayar? Subscription member akan langsung diaktifkan.`}
        confirmLabel="Ya, Aktifkan Subscription"
        variant="warning"
        loading={verifying}
        onConfirm={handleVerifyPayment}
        onClose={() => setVerifyConfirm({ open: false, invoice: null })}
      />
    </div>
  );
}
