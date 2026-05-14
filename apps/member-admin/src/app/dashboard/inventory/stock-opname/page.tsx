'use client';

import { useState, useEffect } from 'react';
import { stockOpnameService, StockOpname, StockOpnameStatus, CreateStockOpnameDto } from '@/services/stock-opname.service';
import { ClipboardList, Plus, Search, Eye, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal, Pagination } from '@/components/ui';
import { usePagination } from '@/hooks/usePagination';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280', in_progress: '#3b82f6', completed: '#10b981', cancelled: '#ef4444',
};

export default function StockOpnamePage() {
  const [opnames, setOpnames] = useState<StockOpname[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockOpnameStatus | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<StockOpname | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{ open: boolean; type: 'complete' | 'cancel'; opname: StockOpname | null }>({ open: false, type: 'complete', opname: null });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await stockOpnameService.getAll({ status: statusFilter || undefined });
      setOpnames(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load stock opnames'); }
    finally { setLoading(false); }
  };

  const handleComplete = async (opname: StockOpname) => {
    setActionConfirm({ open: true, type: 'complete', opname });
  };

  const handleCancel = async (opname: StockOpname) => {
    setActionConfirm({ open: true, type: 'cancel', opname });
  };

  const confirmAction = async () => {
    if (!actionConfirm.opname) return;
    setActionLoading(true);
    try {
      if (actionConfirm.type === 'complete') {
        await stockOpnameService.complete(actionConfirm.opname.id, true);
        toast.success('Stock opname completed');
      } else {
        await stockOpnameService.cancel(actionConfirm.opname.id);
        toast.success('Cancelled');
      }
      setActionConfirm({ open: false, type: 'complete', opname: null });
      await load();
    } catch { toast.error(actionConfirm.type === 'complete' ? 'Failed to complete' : 'Failed to cancel'); }
    finally { setActionLoading(false); }
  };

  const filtered = opnames.filter(o =>
    o.opnameNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.storeName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { page, setPage, totalPages, totalItems, paginated } = usePagination(filtered);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Stock Opname</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Physical inventory count and adjustments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={16} /> New Stock Opname
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by number or store..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="">All Status</option>
          {Object.values(StockOpnameStatus).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <ClipboardList size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>No stock opnames found</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={16} /> New Stock Opname</button>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Number', 'Date', 'Store', 'Items', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-sm) var(--space-lg)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(opname => {
                  const color = STATUS_COLORS[opname.status] || '#6b7280';
                  return (
                    <tr key={opname.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 600 }}>{opname.opnameNumber}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {new Date(opname.opnameDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)' }}>{opname.storeName || '-'}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)' }}>{opname.items?.length || 0}</td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, background: `${color}20`, color, textTransform: 'capitalize' }}>
                          {opname.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setSelected(opname)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }} title="View"><Eye size={16} /></button>
                          {opname.status === StockOpnameStatus.IN_PROGRESS && (
                            <button onClick={() => handleComplete(opname)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)' }} title="Complete"><CheckCircle size={16} /></button>
                          )}
                          {(opname.status === StockOpnameStatus.DRAFT || opname.status === StockOpnameStatus.IN_PROGRESS) && (
                            <button onClick={() => handleCancel(opname)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} title="Cancel"><XCircle size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} />
        </div>
      )}

      {showModal && <CreateModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load(); }} />}
      {selected && <DetailsModal opname={selected} onClose={() => setSelected(null)} />}
      <ConfirmModal
        open={actionConfirm.open}
        title={actionConfirm.type === 'complete' ? 'Selesaikan Stock Opname' : 'Batalkan Stock Opname'}
        description={actionConfirm.type === 'complete'
          ? `Selesaikan stock opname "${actionConfirm.opname?.opnameNumber}" dan terapkan penyesuaian stok? Tindakan ini tidak dapat dibatalkan.`
          : `Batalkan stock opname "${actionConfirm.opname?.opnameNumber}"? Tindakan ini tidak dapat dibatalkan.`
        }
        confirmLabel={actionConfirm.type === 'complete' ? 'Ya, Selesaikan' : 'Ya, Batalkan'}
        variant={actionConfirm.type === 'complete' ? 'warning' : 'danger'}
        loading={actionLoading}
        onConfirm={confirmAction}
        onClose={() => setActionConfirm({ open: false, type: 'complete', opname: null })}
      />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku?: string; stock?: number }[]>([]);
  const [form, setForm] = useState({ storeId: '', opnameDate: new Date().toISOString().split('T')[0], notes: '' });
  const [items, setItems] = useState<{ productId: string; productName: string; systemQuantity: number; physicalQuantity: number }[]>([]);

  useEffect(() => {
    import('@/lib/api-client').then(({ default: apiClient }) => {
      apiClient.get('/stores').then((r: any) => setStores(Array.isArray(r.data) ? r.data : (r.data?.data || []))).catch(() => {});
      apiClient.get('/products').then((r: any) => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setProducts(list);
      }).catch(() => {});
    });
  }, []);

  const addItem = () => setItems(p => [...p, { productId: '', productName: '', systemQuantity: 0, physicalQuantity: 0 }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: string, val: any) =>
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [key]: val } : item));

  const handleProductSelect = (i: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    setItems(prev => prev.map((item, idx) => idx === i ? {
      ...item,
      productId,
      productName: prod?.name || '',
      systemQuantity: Number(prod?.stock || 0),
      physicalQuantity: Number(prod?.stock || 0),
    } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeId) { toast.error('Pilih toko terlebih dahulu'); return; }
    if (items.length === 0) { toast.error('Tambahkan minimal 1 produk'); return; }
    if (items.some(i => !i.productId)) { toast.error('Semua item harus memiliki produk'); return; }
    setLoading(true);
    try {
      await stockOpnameService.create({
        storeId: form.storeId,
        opnameDate: form.opnameDate,
        notes: form.notes || undefined,
        items: items.map(i => ({
          productId: i.productId,
          systemQuantity: i.systemQuantity,
          physicalQuantity: i.physicalQuantity,
        })),
      } as CreateStockOpnameDto);
      toast.success('Stock opname berhasil dibuat');
      onSuccess();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal membuat stock opname'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 700, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 101 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1.1rem' }}>New Stock Opname</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div className="form-group">
              <label className="form-label">Toko *</label>
              <select className="form-input" value={form.storeId} onChange={e => setForm(p => ({ ...p, storeId: e.target.value }))} required>
                <option value="">Pilih toko...</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Opname *</label>
              <input type="date" className="form-input" value={form.opnameDate} onChange={e => setForm(p => ({ ...p, opnameDate: e.target.value }))} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Catatan</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ resize: 'vertical' }} placeholder="Catatan opname..." />
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
              <label className="form-label" style={{ margin: 0 }}>Daftar Produk *</label>
              <button type="button" onClick={addItem} className="btn btn-outline" style={{ height: 30, padding: '0 10px', fontSize: '0.8rem' }}>
                + Tambah Produk
              </button>
            </div>
            {items.length === 0 ? (
              <div style={{ padding: 'var(--space-lg)', textAlign: 'center', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                Klik "Tambah Produk" untuk mulai menambahkan produk yang akan dihitung
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 36px', gap: 0, padding: '6px 12px', background: 'var(--bg-tertiary)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  <div>Produk</div><div style={{ textAlign: 'right' }}>Stok Sistem</div><div style={{ textAlign: 'right' }}>Stok Fisik</div><div />
                </div>
                {items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 36px', gap: 'var(--space-sm)', alignItems: 'center', padding: '8px 12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <select className="form-input" style={{ height: 32, fontSize: '0.85rem' }} value={item.productId}
                      onChange={e => handleProductSelect(i, e.target.value)} required>
                      <option value="">Pilih produk...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>)}
                    </select>
                    <input type="number" className="form-input" style={{ height: 32, textAlign: 'right', fontSize: '0.85rem' }}
                      value={item.systemQuantity} min="0"
                      onChange={e => updateItem(i, 'systemQuantity', Number(e.target.value))} />
                    <input type="number" className="form-input" style={{ height: 32, textAlign: 'right', fontSize: '0.85rem', background: item.physicalQuantity !== item.systemQuantity ? 'rgba(245,158,11,0.08)' : undefined }}
                      value={item.physicalQuantity} min="0"
                      onChange={e => updateItem(i, 'physicalQuantity', Number(e.target.value))} />
                    <button type="button" onClick={() => removeItem(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">Stok Sistem diisi otomatis dari data inventory. Stok Fisik diisi sesuai hasil hitung fisik di gudang.</p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Membuat...' : 'Buat Stock Opname'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailsModal({ opname, onClose }: { opname: StockOpname; onClose: () => void }) {
  const [editItems, setEditItems] = useState(opname.items.map(i => ({ ...i })));
  const [saving, setSaving] = useState(false);
  const canEdit = opname.status === 'in_progress';

  const handleSave = async () => {
    setSaving(true);
    try {
      await stockOpnameService.update(opname.id, {
        items: editItems.map(i => ({
          productId: i.productId,
          systemQuantity: i.systemQuantity,
          physicalQuantity: i.physicalQuantity,
          notes: i.notes,
        })),
      });
      toast.success('Stock opname diperbarui');
      onClose();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 750, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 101 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Stock Opname — {opname.opnameNumber}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
        </div>

        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          {[
            ['Tanggal', new Date(opname.opnameDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })],
            ['Toko', opname.storeName || '-'],
            ['Status', opname.status.replace('_', ' ')],
            ['Total Item', String(opname.items?.length || 0)],
          ].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm) var(--space-md)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
              <div style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.9rem' }}>{v}</div>
            </div>
          ))}
        </div>

        {opname.notes && (
          <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            📝 {opname.notes}
          </div>
        )}

        {canEdit && (
          <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)', fontSize: '0.82rem', color: 'var(--primary)' }}>
            ✏️ Status <strong>In Progress</strong> — Anda bisa mengubah jumlah stok fisik di bawah ini.
          </div>
        )}

        {/* Items table */}
        {editItems.length > 0 && (
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', gap: 0, padding: '8px 12px', background: 'var(--bg-tertiary)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              <div>Produk</div>
              <div style={{ textAlign: 'right' }}>Stok Sistem</div>
              <div style={{ textAlign: 'right' }}>Stok Fisik</div>
              <div style={{ textAlign: 'right' }}>Selisih</div>
            </div>
            {editItems.map((item, i) => {
              const diff = item.physicalQuantity - item.systemQuantity;
              return (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', gap: 'var(--space-sm)', alignItems: 'center', padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', background: diff !== 0 ? 'rgba(245,158,11,0.04)' : undefined }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.productName || item.productId}</div>
                  <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.systemQuantity}</div>
                  {canEdit ? (
                    <input type="number" className="form-input" style={{ height: 30, textAlign: 'right', fontSize: '0.85rem', background: diff !== 0 ? 'rgba(245,158,11,0.08)' : undefined }}
                      value={item.physicalQuantity} min="0"
                      onChange={e => setEditItems(prev => prev.map((it, idx) => idx === i ? { ...it, physicalQuantity: Number(e.target.value) } : it))} />
                  ) : (
                    <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>{item.physicalQuantity}</div>
                  )}
                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                    {diff > 0 ? '+' : ''}{diff}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-outline">Tutup</button>
          {canEdit && (
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
