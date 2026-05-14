"use client";

import { useState, useEffect } from 'react';
import { Package, Search, CheckCircle, Clock, XCircle, AlertCircle, RefreshCcw, Loader2 } from 'lucide-react';
import { api } from '../../../../lib/api';
import toast from 'react-hot-toast';

interface Purchase {
  id: string;
  company_id: string;
  add_on_id: string;
  status: 'active' | 'pending_payment' | 'expired' | 'cancelled';
  purchase_price: number;
  activated_at?: string;
  expires_at?: string;
  cancelled_at?: string;
  auto_renew: boolean;
  created_at: string;
  add_on: { id: string; name: string; slug: string; category: string; pricing_type: string };
  company: { id: string; name: string; email: string };
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  active:          { label: 'Active',           color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: CheckCircle },
  pending_payment: { label: 'Pending Payment',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: Clock },
  expired:         { label: 'Expired',          color: '#f97316', bg: 'rgba(249,115,22,0.1)',  icon: AlertCircle },
  cancelled:       { label: 'Cancelled',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircle },
};

export default function AddOnsPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const data: any = await api.get(`/admin/add-ons/purchases${params}`);
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load purchases:', err);
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPurchases(); }, [statusFilter]);

  const handleActivate = async (purchaseId: string) => {
    setActivating(purchaseId);
    try {
      await api.post(`/admin/add-ons/purchases/${purchaseId}/activate`, {});
      toast.success('Add-on activated successfully');
      fetchPurchases();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to activate add-on');
    } finally {
      setActivating(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' }) : '—';

  const filtered = purchases.filter(p => {
    const q = searchQuery.toLowerCase();
    return !q ||
      p.company?.name?.toLowerCase().includes(q) ||
      p.company?.email?.toLowerCase().includes(q) ||
      p.add_on?.name?.toLowerCase().includes(q);
  });

  const stats = {
    total: purchases.length,
    active: purchases.filter(p => p.status === 'active').length,
    pending: purchases.filter(p => p.status === 'pending_payment').length,
    revenue: purchases.filter(p => p.status === 'active').reduce((s, p) => s + Number(p.purchase_price), 0),
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Add-on Purchases</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Semua pembelian add-on oleh member.</p>
        </div>
        <button onClick={fetchPurchases} className="btn btn-outline">
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid-cols-4" style={{ marginBottom: 'var(--space-xl)' }}>
        {[
          { label: 'Total Purchases', value: stats.total, color: 'var(--accent-base)' },
          { label: 'Active', value: stats.active, color: '#10b981' },
          { label: 'Pending Payment', value: stats.pending, color: '#f59e0b' },
          { label: 'Monthly Revenue', value: formatPrice(stats.revenue), color: 'var(--success)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '1.5rem', color, marginBottom: 4 }}>{value}</h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: 0, marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder="Cari company atau add-on..." className="form-input" style={{ paddingLeft: 36, height: 36, width: '100%' }}
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <select className="form-input" style={{ height: 36, width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            <option value="active">Active</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
            <Package size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Tidak ada pembelian ditemukan</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Company', 'Add-on', 'Harga', 'Status', 'Tanggal Beli', 'Aktif s/d', 'Aksi'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-sm) var(--space-lg)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const cfg = statusConfig[p.status] || statusConfig.cancelled;
                  const StatusIcon = cfg.icon;
                  const isActivating = activating === p.id;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <div style={{ fontWeight: 600 }}>{p.company?.name || '—'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{p.company?.email || '—'}</div>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <div style={{ fontWeight: 500 }}>{p.add_on?.name || '—'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                          {p.add_on?.pricing_type === 'recurring' ? '🔄 Monthly' : '💳 One-time'}
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 600 }}>
                        {formatPrice(p.purchase_price)}
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 12, background: cfg.bg, color: cfg.color, fontSize: '0.8rem', fontWeight: 500 }}>
                          <StatusIcon size={12} /> {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {formatDate(p.created_at)}
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {p.expires_at ? formatDate(p.expires_at) : p.status === 'active' ? '∞ Selamanya' : '—'}
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        {p.status === 'pending_payment' && (
                          <button
                            onClick={() => handleActivate(p.id)}
                            disabled={isActivating}
                            className="btn btn-primary"
                            style={{ height: 32, padding: '0 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            {isActivating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} />}
                            Aktivasi
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}
