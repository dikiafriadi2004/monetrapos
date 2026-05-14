"use client";

import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Search, Copy, RefreshCcw, X, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../components/ConfirmModal';

interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

const emptyForm = {
  code: '', discountType: 'percentage' as 'percentage' | 'fixed',
  discountValue: 10, maxUses: '', expiresAt: '', description: '', isActive: true,
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; coupon: Coupon | null }>({ open: false, coupon: null });
  const [deleting, setDeleting] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/admin/coupons');
      setCoupons(Array.isArray(data) ? data : []);
    } catch { setCoupons([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleSave = async () => {
    if (!form.code) { toast.error('Kode kupon wajib diisi'); return; }
    if (!form.discountValue || form.discountValue <= 0) { toast.error('Nilai diskon tidak valid'); return; }
    setSubmitting(true);
    try {
      await api.post('/admin/coupons', {
        ...form,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      });
      toast.success('Kupon berhasil dibuat');
      setModalOpen(false);
      setForm(emptyForm);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal membuat kupon');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.coupon) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/coupons/${deleteConfirm.coupon.id}`);
      toast.success('Kupon dihapus');
      setCoupons(prev => prev.filter(c => c.id !== deleteConfirm.coupon!.id));
      setDeleteConfirm({ open: false, coupon: null });
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus kupon');
    } finally { setDeleting(false); }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      await api.patch(`/admin/coupons/${coupon.id}`, { isActive: !coupon.isActive });
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c));
    } catch (err: any) { toast.error(err?.message || 'Gagal update status'); }
  };

  const copyCode = async (code: string) => {
    const { copyToClipboardWithToast } = await import('@/utils/clipboard');
    await copyToClipboardWithToast(code, `Kode "${code}" disalin`);
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const filtered = coupons.filter(c => !search || c.code.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.isActive).length,
    used: coupons.reduce((s, c) => s + (c.usedCount || 0), 0),
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Coupon & Promo Codes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Buat kode promo untuk diskon subscription member.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button onClick={fetchCoupons} className="btn btn-outline btn-sm"><RefreshCcw size={14} /></button>
          <button onClick={() => { setForm(emptyForm); setModalOpen(true); }} className="btn btn-primary">
            <Plus size={16} /> Buat Kupon
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { label: 'Total Kupon', value: stats.total, color: 'var(--accent-base)' },
          { label: 'Aktif', value: stats.active, color: 'var(--success)' },
          { label: 'Total Penggunaan', value: stats.used, color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div className="flex-between" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder="Cari kode kupon..." className="form-input" style={{ paddingLeft: 36, height: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{filtered.length} kupon</span>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
            <Tag size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto var(--space-md)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Belum ada kupon</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Kode', 'Diskon', 'Penggunaan', 'Berlaku s/d', 'Status', 'Aksi'].map(h => (
                <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', opacity: c.isActive ? 1 : 0.6 }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--accent-base)', background: 'rgba(99,102,241,0.1)', padding: '4px 10px', borderRadius: 6 }}>{c.code}</span>
                      <button onClick={() => copyCode(c.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }} title="Salin kode">
                        <Copy size={14} />
                      </button>
                    </div>
                    {c.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{c.description}</div>}
                  </td>
                  <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                    {c.discountType === 'percentage' ? `${c.discountValue}%` : `Rp ${c.discountValue.toLocaleString('id-ID')}`}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                    {c.usedCount} {c.maxUses ? `/ ${c.maxUses}` : '/ ∞'}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtDate(c.expiresAt)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span className={`badge ${c.isActive ? 'badge-success' : 'badge-gray'}`}>{c.isActive ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleToggle(c)} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>
                        {c.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button onClick={() => setDeleteConfirm({ open: true, coupon: c })} className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel" style={{ position: 'relative', width: 480, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 9001 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Buat Kupon Baru</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 'var(--space-md)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Kode Kupon *</label>
                <input className="form-input" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="PROMO2024" style={{ fontFamily: 'monospace', fontWeight: 700 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 1 }}>
                <button onClick={() => setForm(p => ({ ...p, code: generateCode() }))} className="btn btn-outline" style={{ height: 40 }}>Generate</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Tipe Diskon</label>
                <select className="form-input" value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value as any }))}>
                  <option value="percentage">Persentase (%)</option>
                  <option value="fixed">Nominal (Rp)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nilai Diskon *</label>
                <input type="number" className="form-input" value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: Number(e.target.value) }))} min="1" max={form.discountType === 'percentage' ? 100 : undefined} />
              </div>
              <div className="form-group">
                <label className="form-label">Maks. Penggunaan</label>
                <input type="number" className="form-input" value={form.maxUses} onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))} placeholder="Kosong = unlimited" min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">Berlaku Hingga</label>
                <input type="date" className="form-input" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Promo akhir tahun..." />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setModalOpen(false)} className="btn btn-outline">Batal</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={submitting || !form.code || !form.discountValue}>
                {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Tag size={14} />}
                Buat Kupon
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteConfirm.open}
        title="Hapus Kupon"
        description={`Hapus kupon "${deleteConfirm.coupon?.code}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm({ open: false, coupon: null })}
      />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}
