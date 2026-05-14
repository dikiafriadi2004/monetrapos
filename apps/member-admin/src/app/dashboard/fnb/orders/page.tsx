'use client';

import { useState, useEffect } from 'react';
import { fnbService, FnbOrder, FnbTable, OrderStatus, OrderType } from '@/services/fnb.service';
import { UtensilsCrossed, Eye, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, PageHeader, SearchInput, StatusBadge, EmptyState, LoadingSpinner, Pagination } from '@/components/ui';
import { usePagination } from '@/hooks/usePagination';
import { useStore } from '@/hooks/useStore';
import apiClient from '@/lib/api-client';
import { formatRupiah } from '@/lib/date';

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

  // Default filter: hari ini
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => { loadOrders(); }, [statusFilter, typeFilter, storeId, dateFrom, dateTo]);

  useEffect(() => {
    if (storeId) {
      loadTables();
      apiClient.get('/customers').then((r: any) => {
        setCustomers(Array.isArray(r.data) ? r.data : (r.data?.data || []));
      }).catch(() => {});
    }
  }, [storeId]);

  const loadTables = async () => {
    if (!storeId) return;
    try {
      // Sync table statuses sekali saat pertama load (non-blocking)
      apiClient.post(`/fnb/tables/sync-status?store_id=${storeId}`).catch(() => {});
      const res = await fnbService.getTables(storeId);
      setTables(Array.isArray(res) ? res : []);
    } catch { /* silent */ }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fnbService.getOrders({
        storeId: storeId || undefined,
        status: statusFilter || undefined,
        orderType: typeFilter || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
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

  const { page, setPage, totalPages, totalItems, paginated } = usePagination(filtered, 12);

  const fmt = (n: number) => `Rp ${formatRupiah(n || 0)}`;

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
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">Dari</span>
          <input type="date" className="form-input w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-sm text-gray-500">s/d</span>
          <input type="date" className="form-input w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <button
            onClick={() => { setDateFrom(today); setDateTo(today); }}
            className="btn btn-ghost btn-sm text-indigo-600 whitespace-nowrap"
            title="Reset ke hari ini"
          >
            Hari Ini
          </button>
          {(dateFrom !== today || dateTo !== today) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="btn btn-ghost btn-sm text-red-500"
              title="Hapus filter tanggal"
            >
              Semua
            </button>
          )}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Belum ada order"
          action={<button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm" disabled={!storeId}><Plus size={14}/> Buat Order</button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map(order => {
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
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} />
        </>
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
          onSuccess={() => { setShowCreate(false); loadOrders(); loadTables(); }}
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
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [form, setForm] = useState({
    orderType: OrderType.DINE_IN as OrderType,
    tableId: '',
    customerId: '',
    deliveryAddress: '',
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<Array<{
    productId: string;
    realProductId?: string;
    variantId?: string;
    productName: string;
    price: number;
    quantity: number;
    notes: string;
  }>>([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (storeId) loadProducts();
  }, [storeId]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const { default: apiClient } = await import('@/lib/api-client');
      const res: any = await apiClient.get('/products', { params: { storeId, isActive: true, limit: 200 } });
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      // Load variants for each product
      const withVariants = await Promise.all(list.map(async (p: any) => {
        try {
          const vRes: any = await apiClient.get(`/products/${p.id}/variants`);
          return { ...p, variants: Array.isArray(vRes.data) ? vRes.data : [] };
        } catch { return { ...p, variants: [] }; }
      }));
      setProducts(withVariants);
    } catch { /* silent */ }
    finally { setLoadingProducts(false); }
  };

  const addItem = (product: any, variant?: any) => {
    const key = variant ? `${product.id}-${variant.id}` : product.id;
    const price = variant ? Number(variant.price || product.price || 0) : Number(product.price || 0);
    const name = product.name;
    const variantName = variant?.name || variant?.variantName || '';
    setOrderItems(prev => {
      const existing = prev.find(i => i.productId === key);
      if (existing) {
        return prev.map(i => i.productId === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        productId: key,
        realProductId: product.id,
        variantId: variant?.id,
        productName: variantName ? `${name} (${variantName})` : name,
        price,
        quantity: 1,
        notes: '',
      }];
    });
  };

  const removeItem = (productId: string) => {
    setOrderItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    setOrderItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setOrderItems(prev => prev.map(i => i.productId === productId ? { ...i, notes } : i));
  };

  const totalAmount = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const fmt = (n: number) => `Rp ${formatRupiah(n || 0)}`;

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) { toast.error('Pilih toko terlebih dahulu'); return; }
    if (form.orderType === OrderType.DINE_IN && !form.tableId) {
      toast.error('Pilih meja untuk Dine-in'); return;
    }
    if (form.orderType === OrderType.DELIVERY && !form.deliveryAddress) {
      toast.error('Masukkan alamat pengiriman'); return;
    }
    if (orderItems.length === 0) {
      toast.error('Tambahkan minimal 1 menu'); return;
    }
    setSaving(true);
    try {
      const { default: apiClient } = await import('@/lib/api-client');

      // Create FnB order with items in one request
      const orderRes: any = await apiClient.post('/fnb/orders', {
        store_id: storeId,
        order_type: form.orderType,
        table_id: form.tableId || undefined,
        customer_id: form.customerId || undefined,
        delivery_address: form.deliveryAddress || undefined,
        notes: form.notes || undefined,
        items: orderItems.map(i => ({
          product_id: i.realProductId || i.productId,
          product_name: i.productName,
          unit_price: i.price,
          quantity: i.quantity,
          variant_id: i.variantId,
          variant_name: i.variantId ? i.productName.match(/\((.+)\)/)?.[1] : undefined,
          notes: i.notes || undefined,
        })),
      });
      const order = orderRes.data;
      toast.success(`Order ${order.order_number || ''} berhasil dibuat`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membuat order');
    } finally { setSaving(false); }
  };

  const availableTables = tables.filter(t => t.status === 'available');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 720, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 101 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>Buat Order Baru</h3>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
            {/* Left: Order Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Tipe Order */}
              <div className="form-group">
                <label className="form-label">Tipe Order *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {Object.values(OrderType).map(type => {
                    const cfg = TYPE_CONFIG[type];
                    const selected = form.orderType === type;
                    return (
                      <button key={type} type="button"
                        onClick={() => setForm(p => ({ ...p, orderType: type, tableId: '', deliveryAddress: '' }))}
                        style={{ padding: '10px 6px', border: `2px solid ${selected ? cfg.color : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', background: selected ? `${cfg.color}10` : 'transparent', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.3rem', marginBottom: 2 }}>{cfg.emoji}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: selected ? cfg.color : 'var(--text-secondary)' }}>{cfg.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meja */}
              {form.orderType === OrderType.DINE_IN && (
                <div className="form-group">
                  <label className="form-label">Pilih Meja *</label>
                  {availableTables.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Belum ada meja. Tambahkan di menu Tables.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 6 }}>
                      {availableTables.map(t => (
                        <button key={t.id} type="button"
                          onClick={() => setForm(p => ({ ...p, tableId: t.id }))}
                          style={{ padding: '8px 4px', border: `2px solid ${form.tableId === t.id ? '#6366f1' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', background: form.tableId === t.id ? 'rgba(99,102,241,0.1)' : 'transparent', cursor: 'pointer', textAlign: 'center', fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: 700 }}>{t.tableNumber}</div>
                          <div style={{ fontSize: '0.65rem', color: t.status === 'available' ? 'var(--success)' : 'var(--warning)' }}>{t.status === 'available' ? 'Kosong' : 'Terisi'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alamat Delivery */}
              {form.orderType === OrderType.DELIVERY && (
                <div className="form-group">
                  <label className="form-label">Alamat Pengiriman *</label>
                  <textarea className="form-input" rows={2} value={form.deliveryAddress}
                    onChange={e => setForm(p => ({ ...p, deliveryAddress: e.target.value }))}
                    placeholder="Masukkan alamat lengkap..." required />
                </div>
              )}

              {/* Pelanggan */}
              <div className="form-group">
                <label className="form-label">Pelanggan (Opsional)</label>
                <select className="form-input" value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}>
                  <option value="">Walk-in</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                </select>
              </div>

              {/* Catatan */}
              <div className="form-group">
                <label className="form-label">Catatan Order</label>
                <input className="form-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan khusus..." />
              </div>

              {/* Order Summary */}
              {orderItems.length > 0 && (
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>Ringkasan Order</div>
                  {orderItems.map(item => (
                    <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ flex: 1, fontSize: '0.85rem' }}>
                        <span>{item.productName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <button type="button" onClick={() => updateQty(item.productId, item.quantity - 1)}
                            style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border-subtle)', background: 'white', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                          <button type="button" onClick={() => updateQty(item.productId, item.quantity + 1)}
                            style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border-subtle)', background: 'white', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          <input style={{ flex: 1, fontSize: '0.75rem', padding: '2px 6px', border: '1px solid var(--border-subtle)', borderRadius: 4 }}
                            placeholder="Catatan item..." value={item.notes}
                            onChange={e => updateItemNotes(item.productId, e.target.value)} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: 8 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>{fmt(item.price * item.quantity)}</div>
                        <button type="button" onClick={() => removeItem(item.productId)} style={{ fontSize: '0.7rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Hapus</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Total</span><span style={{ color: 'var(--success)' }}>{fmt(totalAmount)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Product Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <label className="form-label">Pilih Menu *</label>
              <input className="form-input" placeholder="Cari menu..." value={productSearch}
                onChange={e => setProductSearch(e.target.value)} style={{ marginBottom: 4 }} />
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                {loadingProducts ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Memuat menu...</div>
                ) : filteredProducts.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                    {products.length === 0 ? 'Belum ada produk. Tambahkan produk terlebih dahulu.' : 'Produk tidak ditemukan'}
                  </div>
                ) : (
                  filteredProducts.map(product => {
                    const inCart = orderItems.find(i => i.productId === product.id || i.realProductId === product.id);
                    const hasVariants = product.variants && product.variants.length > 0;
                    return (
                      <div key={product.id}>
                        {/* Product row — clickable only if no variants */}
                        {!hasVariants ? (
                          <div
                            onClick={() => addItem(product)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', background: inCart ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{product.name}</div>
                              {product.category?.name && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{product.category.name}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.9rem' }}>{fmt(Number(product.price || 0))}</div>
                              {inCart && <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>×{inCart.quantity}</div>}
                            </div>
                          </div>
                        ) : (
                          <div>
                            {/* Product header */}
                            <div style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{product.name}</div>
                              {product.category?.name && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{product.category.name}</div>}
                            </div>
                            {/* Variants */}
                            {product.variants.map((v: any) => {
                              const vKey = `${product.id}-${v.id}`;
                              const vInCart = orderItems.find(i => i.productId === vKey);
                              return (
                                <div key={v.id}
                                  onClick={() => addItem(product, v)}
                                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px 8px 24px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', background: vInCart ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>↳ {v.name || v.variantName}</div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.85rem' }}>{fmt(Number(v.price || product.price || 0))}</div>
                                    {vInCart && <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>×{vInCart.quantity}</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-lg)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving || orderItems.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {saving ? 'Membuat...' : `Buat Order (${orderItems.length} item)`}
            </button>
          </div>
        </form>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
      </div>
    </div>
  );
}
