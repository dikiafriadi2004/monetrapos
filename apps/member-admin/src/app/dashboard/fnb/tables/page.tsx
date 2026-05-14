'use client';

import { useState, useEffect, useCallback } from 'react';
import { fnbService, FnbTable, FnbOrder, TableStatus, OrderStatus, OrderType } from '@/services/fnb.service';
import { useStore } from '@/hooks/useStore';
import { Grid3x3, Plus, Edit2, Trash2, Loader2, X, UtensilsCrossed, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal, Pagination } from '@/components/ui';
import { usePagination } from '@/hooks/usePagination';
import apiClient from '@/lib/api-client';
import { formatRupiah } from '@/lib/date';

const STATUS_CONFIG: Record<TableStatus, { label: string; color: string; bg: string }> = {
  [TableStatus.AVAILABLE]: { label: 'Tersedia', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  [TableStatus.OCCUPIED]:  { label: 'Terisi',   color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  [TableStatus.RESERVED]:  { label: 'Dipesan',  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  [TableStatus.CLEANING]:  { label: 'Dibersihkan', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '🔴 Menunggu', preparing: '🟡 Dimasak',
  ready: '🟢 Siap', served: '🔵 Disajikan',
};

const fmt = (n: number) => `Rp ${formatRupiah(n || 0)}`;

export default function FnbTablesPage() {
  const { storeId, stores } = useStore();
  const [tables, setTables] = useState<FnbTable[]>([]);
  const [activeOrders, setActiveOrders] = useState<FnbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing: FnbTable | null }>({ open: false, editing: null });
  const [form, setForm] = useState({ tableNumber: '', capacity: 4, floor: '', status: TableStatus.AVAILABLE });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; table: FnbTable | null }>({ open: false, table: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Add items modal
  const [addItemsModal, setAddItemsModal] = useState<{ open: boolean; order: FnbOrder | null }>({ open: false, order: null });

  const loadData = useCallback(async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      const [tablesRes, ordersRes] = await Promise.all([
        fnbService.getTables(storeId),
        fnbService.getOrders({ storeId }).catch(() => []),
      ]);
      setTables(Array.isArray(tablesRes) ? tablesRes : []);
      const active = (Array.isArray(ordersRes) ? ordersRes : []).filter(
        (o: FnbOrder) => !['completed', 'cancelled'].includes(o.status)
      );
      setActiveOrders(active);
    } catch { toast.error('Gagal memuat data meja'); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const { page, setPage, totalPages, totalItems, paginated: paginatedTables } = usePagination(tables, 24);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getTableOrder = (tableId: string) =>
    activeOrders.find(o => (o as any).tableId === tableId || (o as any).table_id === tableId);

  const openModal = (table?: FnbTable) => {
    setForm(table
      ? { tableNumber: table.tableNumber, capacity: table.capacity, floor: table.floor || '', status: table.status }
      : { tableNumber: '', capacity: 4, floor: '', status: TableStatus.AVAILABLE }
    );
    setModal({ open: true, editing: table || null });
  };

  const save = async () => {
    if (!form.tableNumber) { toast.error('Nomor meja wajib diisi'); return; }
    if (!storeId) { toast.error('Tidak ada toko aktif'); return; }
    setSaving(true);
    try {
      if (modal.editing) {
        await fnbService.updateTable(modal.editing.id, { tableNumber: form.tableNumber, capacity: form.capacity, floor: form.floor || undefined, status: form.status });
        toast.success('Meja berhasil diperbarui');
      } else {
        await fnbService.createTable({ storeId, tableNumber: form.tableNumber, capacity: form.capacity, floor: form.floor || undefined });
        toast.success('Meja berhasil ditambahkan');
      }
      await loadData();
      setModal({ open: false, editing: null });
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal menyimpan meja'); }
    finally { setSaving(false); }
  };

  const confirmRemove = async () => {
    if (!deleteConfirm.table) return;
    setDeleteLoading(true);
    try {
      await fnbService.deleteTable(deleteConfirm.table.id);
      toast.success('Meja berhasil dihapus');
      setTables(prev => prev.filter(t => t.id !== deleteConfirm.table!.id));
      setDeleteConfirm({ open: false, table: null });
    } catch { toast.error('Gagal menghapus meja'); }
    finally { setDeleteLoading(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Denah Meja</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Toko: <strong>{stores.find(s => s.id === storeId)?.name || 'Toko Utama'}</strong>
            {' · '}{tables.length} meja · {activeOrders.length} order aktif
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadData} className="btn btn-outline"><RefreshCcw size={14} /> Refresh</button>
          <button onClick={() => openModal()} className="btn btn-primary"><Plus size={16} /> Tambah Meja</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: cfg.color, display: 'inline-block' }} />
            {cfg.label}
          </div>
        ))}
      </div>

      {tables.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <Grid3x3 size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>Belum ada meja. Tambahkan meja pertama Anda.</p>
          <button onClick={() => openModal()} className="btn btn-primary"><Plus size={16} /> Tambah Meja</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-md)' }}>
            {paginatedTables.map(table => {
              const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG[TableStatus.AVAILABLE];
              const order = getTableOrder(table.id);
              return (
                <div key={table.id} className="glass-panel animate-fade-in" style={{
                  padding: 'var(--space-md)', textAlign: 'center',
                  borderTop: `3px solid ${cfg.color}`,
                  background: order ? cfg.bg : undefined,
                }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 2 }}>{table.tableNumber}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Kapasitas: {table.capacity}</div>
                  {table.floor && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>{table.floor}</div>}
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: cfg.color, marginBottom: 'var(--space-sm)' }}>{cfg.label}</div>

                  {/* Active order info */}
                  {order && (
                    <div style={{ marginBottom: 8, padding: '6px 8px', background: 'rgba(0,0,0,0.04)', borderRadius: 6, fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>#{order.orderNumber}</div>
                      <div style={{ color: ORDER_STATUS_LABEL[order.status] ? undefined : 'var(--text-tertiary)' }}>
                        {ORDER_STATUS_LABEL[order.status] || order.status}
                      </div>
                      <div style={{ color: 'var(--success)', fontWeight: 600, marginTop: 2 }}>{fmt(order.total)}</div>
                      <div style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{order.items?.length || 0} item</div>
                      <button
                        onClick={() => setAddItemsModal({ open: true, order })}
                        style={{ marginTop: 6, width: '100%', padding: '4px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      >
                        <Plus size={11} /> Tambah Menu
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button onClick={() => openModal(table)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteConfirm({ open: true, table })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} />
        </>
      )}

      {/* Edit/Add Table Modal */}
      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModal({ open: false, editing: null })} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 440, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{modal.editing ? 'Edit Meja' : 'Tambah Meja'}</h3>
              <button onClick={() => setModal({ open: false, editing: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              🏪 Toko: <strong>{stores.find(s => s.id === storeId)?.name || 'Toko Utama'}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Nomor Meja *</label>
                <input className="form-input" value={form.tableNumber} onChange={e => setForm(p => ({ ...p, tableNumber: e.target.value }))} placeholder="T1, A3, Meja-01" />
              </div>
              <div className="form-group">
                <label className="form-label">Kapasitas</label>
                <input type="number" className="form-input" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))} min="1" max="50" />
              </div>
              <div className="form-group">
                <label className="form-label">Lantai / Area</label>
                <input className="form-input" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} placeholder="Lantai 1, Outdoor, VIP" />
              </div>
              {modal.editing && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as TableStatus }))}>
                    {Object.entries(STATUS_CONFIG).map(([s, cfg]) => <option key={s} value={s}>{cfg.label}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setModal({ open: false, editing: null })} className="btn btn-outline">Batal</button>
              <button onClick={save} className="btn btn-primary" disabled={saving || !form.tableNumber}>
                {saving ? 'Menyimpan...' : modal.editing ? 'Perbarui' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Modal */}
      {addItemsModal.open && addItemsModal.order && (
        <AddItemsModal
          order={addItemsModal.order}
          storeId={storeId || ''}
          onClose={() => setAddItemsModal({ open: false, order: null })}
          onSuccess={() => { setAddItemsModal({ open: false, order: null }); loadData(); }}
        />
      )}

      <ConfirmModal open={!!deleteConfirm?.open} onClose={() => setDeleteConfirm({ open: false, table: null })} onConfirm={confirmRemove}
        title="Hapus Meja" description={`Hapus meja "${deleteConfirm?.table?.tableNumber}"?`}
        confirmLabel="Ya, Hapus" loading={deleteLoading} />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

// ── Add Items Modal ───────────────────────────────────────────────────────────
function AddItemsModal({ order, storeId, onClose, onSuccess }: {
  order: FnbOrder; storeId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; realProductId: string; variantId?: string; productName: string; price: number; quantity: number; notes: string }>>([]);

  useEffect(() => {
    apiClient.get('/products', { params: { storeId, isActive: true, limit: 200 } })
      .then(async (res: any) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const withVariants = await Promise.all(list.map(async (p: any) => {
          try {
            const vRes: any = await apiClient.get(`/products/${p.id}/variants`);
            return { ...p, variants: Array.isArray(vRes.data) ? vRes.data : [] };
          } catch { return { ...p, variants: [] }; }
        }));
        setProducts(withVariants);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId]);

  const addItem = (product: any, variant?: any) => {
    const key = variant ? `${product.id}-${variant.id}` : product.id;
    const price = variant ? Number(variant.price || product.price || 0) : Number(product.price || 0);
    const variantName = variant?.name || variant?.variantName || '';
    const name = variantName ? `${product.name} (${variantName})` : product.name;
    setItems(prev => {
      const existing = prev.find(i => i.productId === key);
      if (existing) return prev.map(i => i.productId === key ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: key, realProductId: product.id, variantId: variant?.id, productName: name, price, quantity: 1, notes: '' }];
    });
  };

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) setItems(prev => prev.filter(i => i.productId !== key));
    else setItems(prev => prev.map(i => i.productId === key ? { ...i, quantity: qty } : i));
  };

  const handleSubmit = async () => {
    if (items.length === 0) { toast.error('Pilih minimal 1 menu'); return; }
    setSaving(true);
    try {
      await apiClient.post(`/fnb/orders/${order.id}/items`, {
        items: items.map(i => ({
          product_id: i.realProductId,
          product_name: i.productName,
          unit_price: i.price,
          quantity: i.quantity,
          variant_id: i.variantId,
          notes: i.notes || undefined,
        })),
      });
      toast.success(`${items.length} menu berhasil ditambahkan ke order ${order.orderNumber}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menambah menu');
    } finally { setSaving(false); }
  };

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 680, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 201 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Tambah Menu — Order #{order.orderNumber}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
              {order.tableName ? `🪑 Meja ${order.tableName}` : ''} · {order.items?.length || 0} item sudah ada
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          {/* Product list */}
          <div>
            <input className="form-input" placeholder="Cari menu..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 8 }} />
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', maxHeight: 340, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Memuat menu...</div>
              ) : filtered.map(product => {
                const hasVariants = product.variants?.length > 0;
                return (
                  <div key={product.id}>
                    {!hasVariants ? (
                      <div onClick={() => addItem(product)} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{product.name}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>{fmt(Number(product.price || 0))}</span>
                      </div>
                    ) : (
                      <div>
                        <div style={{ padding: '7px 12px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.82rem', fontWeight: 600 }}>{product.name}</div>
                        {product.variants.map((v: any) => (
                          <div key={v.id} onClick={() => addItem(product, v)} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px 7px 24px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', fontSize: '0.82rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>↳ {v.name || v.variantName}</span>
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(Number(v.price || product.price || 0))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected items */}
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>Tambahan Pesanan</div>
            {items.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                Klik menu di kiri untuk menambahkan
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(item => (
                  <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                    <div style={{ flex: 1, fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 500 }}>{item.productName}</div>
                      <div style={{ color: 'var(--success)', fontSize: '0.78rem' }}>{fmt(item.price)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border-subtle)', background: 'white', cursor: 'pointer', fontSize: '0.9rem' }}>−</button>
                      <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center', fontSize: '0.85rem' }}>{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border-subtle)', background: 'white', cursor: 'pointer', fontSize: '0.9rem' }}>+</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, padding: '8px 10px', borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}>
                  <span>Total Tambahan</span>
                  <span style={{ color: 'var(--success)' }}>{fmt(total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-lg)' }}>
          <button onClick={onClose} className="btn btn-outline">Batal</button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={saving || items.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Menambahkan...' : `Tambah ${items.length} Menu`}
          </button>
        </div>
      </div>
    </div>
  );
}
