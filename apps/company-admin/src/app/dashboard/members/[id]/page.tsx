"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Mail, Phone, CreditCard, Receipt, Package, RefreshCcw, CheckCircle, XCircle, Clock, AlertCircle, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { api } from '../../../../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../../components/ConfirmModal';

interface MemberDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  businessType?: string;
  status: string;
  subscriptionStatus: string;
  subscriptionEndsAt?: string;
  createdAt: string;
  currentPlan?: { name: string; slug: string };
  statistics?: { totalStores: number; totalUsers: number; totalProducts: number; totalTransactions: number };
}

interface Subscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  plan?: { name: string };
  durationMonths?: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  createdAt: string;
  paidAt?: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'badge-success', suspended: 'badge-danger', pending: 'badge-warning',
    paid: 'badge-success', cancelled: 'badge-danger', expired: 'badge-warning',
  };
  return <span className={`badge ${map[status] || 'badge-gray'} capitalize`}>{status}</span>;
};

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [addOns, setAddOns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'invoices' | 'addons'>('overview');
  const [statusConfirm, setStatusConfirm] = useState<{ open: boolean; action: 'suspend' | 'activate' }>({ open: false, action: 'suspend' });
  const [actionLoading, setActionLoading] = useState(false);
  const [extendModal, setExtendModal] = useState(false);
  const [extendMonths, setExtendMonths] = useState(1);
  const [extending, setExtending] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [memberData, subsData, invData, addOnsData] = await Promise.allSettled([
        api.get(`/admin/companies/${id}`),
        api.get(`/admin/companies/${id}/subscriptions`).catch(() => []),
        api.get(`/billing/admin/invoices?companyId=${id}`).catch(() => []),
        api.get(`/add-ons/purchased/list`).catch(() => []),
      ]);
      if (memberData.status === 'fulfilled') setMember(memberData.value as any);
      if (subsData.status === 'fulfilled') setSubscriptions(Array.isArray(subsData.value) ? subsData.value as Subscription[] : []);
      if (invData.status === 'fulfilled') {
        const d = invData.value as any;
        setInvoices(Array.isArray(d) ? d : (d?.data || []));
      }
      if (addOnsData.status === 'fulfilled') setAddOns(Array.isArray(addOnsData.value) ? addOnsData.value as any[] : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchAll(); }, [id]);

  const handleToggleStatus = async () => {
    if (!member) return;
    setActionLoading(true);
    const newStatus = statusConfirm.action === 'suspend' ? 'suspended' : 'active';
    try {
      await api.patch(`/admin/companies/${id}/status`, { status: newStatus });
      setMember(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Member ${newStatus === 'suspended' ? 'disuspend' : 'diaktifkan'}`);
      setStatusConfirm({ open: false, action: 'suspend' });
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengubah status');
    } finally {
      setActionLoading(false); }
  };

  const handleExtendSubscription = async () => {
    setExtending(true);
    try {
      await api.post(`/admin/companies/${id}/extend-subscription`, { months: extendMonths });
      toast.success(`Subscription diperpanjang ${extendMonths} bulan`);
      setExtendModal(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memperpanjang subscription');
    } finally { setExtending(false); }
  };

  const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '—';

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>;
  if (!member) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--danger)' }}>Member tidak ditemukan</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <button onClick={() => router.push('/dashboard/members')} className="btn btn-outline btn-sm" style={{ marginBottom: 'var(--space-md)' }}>
          <ArrowLeft size={14} /> Kembali
        </button>
        <div className="flex-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-base)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700 }}>
              {member.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>{member.name}</h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {statusBadge(member.status)}
                {statusBadge(member.subscriptionStatus)}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  {member.businessType === 'fnb' ? '🍽️ F&B' : member.businessType === 'laundry' ? '👕 Laundry' : '🛒 Retail'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button onClick={() => setExtendModal(true)} className="btn btn-primary btn-sm">
              <CreditCard size={14} /> Perpanjang Subscription
            </button>
            {member.status === 'active' ? (
              <button onClick={() => setStatusConfirm({ open: true, action: 'suspend' })} className="btn btn-outline btn-sm" style={{ color: 'var(--warning)' }}>
                <ShieldOff size={14} /> Suspend
              </button>
            ) : (
              <button onClick={() => setStatusConfirm({ open: true, action: 'activate' })} className="btn btn-outline btn-sm" style={{ color: 'var(--success)' }}>
                <ShieldCheck size={14} /> Aktifkan
              </button>
            )}
            <button onClick={fetchAll} className="btn btn-outline btn-sm"><RefreshCcw size={14} /></button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { label: 'Toko', value: member.statistics?.totalStores || 0, icon: Building2, color: 'var(--accent-base)' },
          { label: 'Users', value: member.statistics?.totalUsers || 0, icon: CheckCircle, color: 'var(--success)' },
          { label: 'Produk', value: member.statistics?.totalProducts || 0, icon: Package, color: 'var(--warning)' },
          { label: 'Transaksi', value: member.statistics?.totalTransactions || 0, icon: Receipt, color: '#ec4899' },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `${s.color}20`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <s.icon size={16} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="glass-panel" style={{ padding: 0, marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'subscriptions', label: `Subscriptions (${subscriptions.length})` },
            { key: 'invoices', label: `Invoices (${invoices.length})` },
            { key: 'addons', label: `Add-ons (${addOns.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{
              flex: 1, padding: 'var(--space-md)', background: activeTab === tab.key ? 'rgba(99,102,241,0.1)' : 'transparent',
              border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--accent-base)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--accent-base)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 'var(--space-lg)' }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-tertiary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Informasi Kontak</h4>
                {[
                  ['Email', member.email, Mail],
                  ['Phone', member.phone || '—', Phone],
                  ['Bergabung', fmtDate(member.createdAt), Building2],
                ].map(([label, value, Icon]: any) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Icon size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{label}</div>
                      <div style={{ fontWeight: 500 }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-tertiary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Subscription</h4>
                {[
                  ['Plan', member.currentPlan?.name || 'Free'],
                  ['Status', member.subscriptionStatus],
                  ['Berakhir', fmtDate(member.subscriptionEndsAt)],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                    <span style={{ fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div>
              {subscriptions.length === 0 ? <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>Tidak ada data subscription</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Plan', 'Status', 'Mulai', 'Berakhir', 'Durasi'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {subscriptions.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{s.plan?.name || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{statusBadge(s.status)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtDate(s.startDate)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtDate(s.endDate)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{s.durationMonths ? `${s.durationMonths} bulan` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div>
              {invoices.length === 0 ? <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>Tidak ada invoice</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Invoice', 'Amount', 'Status', 'Tanggal', 'Dibayar'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--accent-base)', fontSize: '0.85rem' }}>{inv.invoiceNumber}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--success)' }}>{fmt(Number(inv.total))}</td>
                        <td style={{ padding: '10px 12px' }}>{statusBadge(inv.status)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtDate(inv.createdAt)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtDate(inv.paidAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'addons' && (
            <div>
              {addOns.length === 0 ? <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-xl)' }}>Tidak ada add-on aktif</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
                  {addOns.map((a: any) => (
                    <div key={a.id} style={{ padding: 'var(--space-md)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.add_on?.name || '—'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>{a.add_on?.category}</div>
                      {statusBadge(a.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Extend Subscription Modal */}
      {extendModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setExtendModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel" style={{ position: 'relative', width: 400, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 9001 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-lg)' }}>Perpanjang Subscription</h3>
            <div className="form-group">
              <label className="form-label">Durasi Perpanjangan</label>
              <select className="form-input" value={extendMonths} onChange={e => setExtendMonths(Number(e.target.value))}>
                {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m} bulan</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setExtendModal(false)} className="btn btn-outline">Batal</button>
              <button onClick={handleExtendSubscription} className="btn btn-primary" disabled={extending}>
                {extending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CreditCard size={14} />}
                Perpanjang
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={statusConfirm.open}
        title={statusConfirm.action === 'suspend' ? 'Suspend Member' : 'Aktifkan Member'}
        description={statusConfirm.action === 'suspend'
          ? `Suspend "${member.name}"? Member tidak bisa login selama disuspend.`
          : `Aktifkan kembali akses untuk "${member.name}"?`}
        confirmLabel={statusConfirm.action === 'suspend' ? 'Suspend' : 'Aktifkan'}
        variant={statusConfirm.action === 'suspend' ? 'warning' : 'danger'}
        loading={actionLoading}
        onConfirm={handleToggleStatus}
        onClose={() => setStatusConfirm({ open: false, action: 'suspend' })}
      />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}
