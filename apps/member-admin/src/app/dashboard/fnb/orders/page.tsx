'use client';

import { useState, useEffect } from 'react';
import { fnbService, FnbOrder, FnbTable, OrderStatus, OrderType } from '@/services/fnb.service';
import { UtensilsCrossed, Eye, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, PageHeader, SearchInput, StatusBadge, EmptyState, LoadingSpinner } from '@/components/ui';
import { useStore } from '@/hooks/useStore';
import apiClient from '@/lib/api-client';

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-warning', preparing: 'bg-purple-100 text-purple-700', ready: 'badge-success',
  served: 'badge-primary', completed: 'badge-gray', cancelled: 'badge-danger',
};

const TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  'dine-in':  { label: 'Dine-in',  emoji: '🪑', color: '#6366f1' },
  takeaway:   { label: 'Takeaway', emoji: '🥡', color: '#f59e0b' },
  delivery:   { label: 'Delivery', emoji: '🛵', color: '#10b981' },
};

export default function FnbOrdersPage() {
  const { storeId } = useStore();
  const [orders, setOrders] = useState<FnbOrder[]>([]);
  const [tables, setTables] = useState<FnbTable[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<OrderType | ''>('');
  const [selectedOrder, setSelectedOrder] = useState<FnbOrder | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadOrders(); }, [statusFilter, typeFilter, storeId]);

  useEffect(() => {
    if (storeId) {
      fnbService.getTables(storeId).then(setTables).catch(() => {});
      apiClient.get('/customers').then((r: any) => {
        setCustomers(Array.isArray(r.data) ? r.data : (r.data?.data || []));
      }).catch(() => {});
    }
  }, [storeId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fnbService.getOrders({
        storeId: storeId || undefined,
        status: statusFilter || undefined,
        orderType: typeFilter || undefined,
      });
      setOrders(Array.isArray(res) ? res : []);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await fnbService.updateOrderStatus(orderId, newStatus);
      toast.success('Status updated');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch { toast.error('Failed to update status'); }
  };

  const filtered = orders.filter(o =>
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

  // Stats per type
  const stats = Object.values(OrderType).map(type => ({
    type,
    ...TYPE_CONFIG[type],
    count: orders.filter(o => o.orderType === type).length,
    active: orders.filter(o => o.orderType === type && !['completed','cancelled'].includes(o.status)).length,
  }));

  return (
    <div>
      <PageHeader title="F&B Orders" description="Kelola pesanan berdasarkan tipe layanan"
        action={
          <button onClick={() => setShowCreate(true)} className="btn btn-primary" disabled={!storeId}>
            <Plus size={16} /> New Order
          </button>
        }
      />

      {/* Type Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => (
          <button
            key={s.type}
            onClick={() => setTypeFilter(typeFilter === s.type ? '' : s.type)}
            className={`card text-left transition-all ${typeFilter === s.type ? 'ring-2 ring-indigo-500' : ''}`}
            style={{ padding: '1rem' }}
          >
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '1.75rem' }}>{s.emoji}</span>
              <div>
                <div className="font-semibold text-gray-900">{s.label}</div>
                <div className="text-sm text-gray-500">{s.count} total · {s.active} aktif</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Cari nomor order atau nama pelanggan..." className="flex-1 min-w-[200px]" />
        <select className="form-input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="">Semua Status</option>
          {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Belum ada order"
          action={<button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm" disabled={!storeId}><Plus size={14}/> Buat Order</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(order => {
            const typeCfg = TYPE_CONFIG[order.orderType] || { label: order.orderType, emoji: '📋', color: '#6b7280' };
            return (
              <div key={order.id} className="card hover:shadow-md transition-shadow animate-fade-in">
                <div className="card-body">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                      background: `${typeCfg.color}15`, color: typeCfg.color,
                    }}>
                      {typeCfg.emoji} {typeCfg.label}
                    </span>
                  </div>
                  {order.tableName && <p className="text-sm text-gray-600 mb-1">🪑 Meja {order.tableName}</p>}
                  {order.customerName && <p className="text-sm text-gray-600 mb-1">👤 {order.customerName}</p>}
                  {order.orderType === OrderType.DELIVERY && (
                    <p className="text-xs text-gray-400 mb-1">🛵 Delivery</p>
                  )}
                  <p className="text-sm text-gray-500 mb-3">{order.items?.length || 0} item</p>
                  <p className="text-lg font-bold text-emerald-600 mb-3">{fmt(order.total)}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'} capitalize`}>{order.status}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedOrder(order)} className="btn btn-outline btn-sm"><Eye size={13}/> Detail</button>
                      {order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED && (
                        <select className="form-input h-8 text-xs py-0 w-32" value={order.status}
                          onChange={e => handleUpdateStatus(order.id, e.target.value as OrderStatus)}>
                          {[OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED, OrderStatus.COMPLETED].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order — ${selectedOrder?.orderNumber}`} size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            {/* Type badge */}
            {(() => {
              const cfg = TYPE_CONFIG[selectedOrder.orderType] || { label: selectedOrder.orderType, emoji: '📋', color: '#6b7280' };
              return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: `${cfg.color}15`, color: cfg.color, fontWeight: 600, fontSize: '0.9rem' }}>
                  {cfg.emoji} {cfg.label}
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Status', selectedOrder.status],
                ...(selectedOrder.tableName ? [['Meja', selectedOrder.tableName]] : []),
                ...(selectedOrder.customerName ? [['Pelanggan', selectedOrder.customerName]] : []),
                ['Tanggal', new Date(selectedOrder.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })],
              ].map(([l, v]) => (
                <div key={l}><p className="text-xs text-gray-400 uppercase">{l}</p><p className="font-semibold mt-0.5 capitalize">{v}</p></div>
              ))}
            </div>
            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Items</p>
                {selectedOrder.items.map(item => (
                  <div key={item.id} className="flex justify-between py-1.5 border-b border-gray-100 text-sm">
                    <div>
                      <span>{item.productName || item.productId}</span>
                      <span className="text-gray-400 ml-2">×{item.quantity}</span>
                      {item.notes && <p className="text-xs text-amber-600">📝 {item.notes}</p>}
                    </div>
                    <span className="font-medium">{fmt(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{fmt(selectedOrder.subtotal)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>Pajak</span><span>{fmt(selectedOrder.tax)}</span></div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200">
                <span>Total</span><span className="text-emerald-600">{fmt(selectedOrder.total)}</span>
              </div>
            </div>
            {selectedOrder.notes && <p className="text-sm text-gray-500">📝 {selectedOrder.notes}</p>}
          </div>
        )}
      </Modal>

      {/* Create Order Modal */}
      {showCreate && (
        <CreateOrderModal
          storeId={storeId || ''}
          tables={tables}
          customers={customers}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); loadOrders(); }}
        />
      )}
    </div>
  );
}

// ── Create Order Modal ────────────────────────────────────────────────────────
function CreateOrderModal({
  storeId, tables, customers, onClose, onSuccess,
}: {
  storeId: string;
  tables: FnbTable[];
  customers: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    orderType: OrderType.DINE_IN as OrderType,
    tableId: '',
    customerId: '',
    deliveryAddress: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) { toast.error('Pilih toko terlebih dahulu'); return; }
    if (form.orderType === OrderType.DINE_IN && !form.tableId) {
      toast.error('Pilih meja untuk Dine-in'); return;
    }
    if (form.orderType === OrderType.DELIVERY && !form.deliveryAddress) {
      toast.error('Masukkan alamat pengiriman'); return;
    }
    setSaving(true);
    try {
      await fnbService.createOrder({
        storeId,
        orderType: form.orderType,
        tableId: form.tableId || undefined,
        customerId: form.customerId || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Order berhasil dibuat');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membuat order');
    } finally { setSaving(false); }
  };

  const availableTables = tables.filter(t => t.status === 'available' || t.status === 'occupied');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 520, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>Buat Order Baru</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipe Order */}
          <div className="form-group">
            <label className="form-label">Tipe Order *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {Object.values(OrderType).map(type => {
                const cfg = TYPE_CONFIG[type];
                const selected = form.orderType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, orderType: type, tableId: '', deliveryAddress: '' }))}
                    style={{
                      padding: '12px 8px',
                      border: `2px solid ${selected ? cfg.color : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: selected ? `${cfg.color}10` : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{cfg.emoji}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: selected ? cfg.color : 'var(--text-secondary)' }}>
                      {cfg.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meja - hanya untuk Dine-in */}
          {form.orderType === OrderType.DINE_IN && (
            <div className="form-group">
              <label className="form-label">Pilih Meja *</label>
              {availableTables.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                  Belum ada meja. Tambahkan meja di menu Tables.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                  {availableTables.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, tableId: t.id }))}
                      style={{
                        padding: '10px 6px',
                        border: `2px solid ${form.tableId === t.id ? '#6366f1' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: form.tableId === t.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{t.tableNumber}</div>
                      <div style={{ fontSize: '0.7rem', color: t.status === 'available' ? 'var(--success)' : 'var(--warning)' }}>
                        {t.status === 'available' ? 'Kosong' : 'Terisi'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alamat - hanya untuk Delivery */}
          {form.orderType === OrderType.DELIVERY && (
            <div className="form-group">
              <label className="form-label">Alamat Pengiriman *</label>
              <textarea
                className="form-input"
                rows={2}
                value={form.deliveryAddress}
                onChange={e => setForm(p => ({ ...p, deliveryAddress: e.target.value }))}
                placeholder="Masukkan alamat lengkap pengiriman..."
                required
              />
            </div>
          )}

          {/* Pelanggan - opsional */}
          <div className="form-group">
            <label className="form-label">Pelanggan (Opsional)</label>
            <select className="form-input" value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}>
              <option value="">Walk-in / Tanpa pelanggan</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Catatan */}
          <div className="form-group">
            <label className="form-label">Catatan</label>
            <input
              className="form-input"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Catatan khusus untuk order ini..."
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {saving ? 'Membuat...' : 'Buat Order'}
            </button>
          </div>
        </form>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
      </div>
    </div>
  );
}
