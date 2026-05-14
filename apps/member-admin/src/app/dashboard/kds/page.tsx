"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChefHat, Clock, CheckCircle2, RefreshCcw, Flame, Wifi, WifiOff, Printer } from 'lucide-react';
import { fnbService, FnbOrder, OrderStatus } from '@/services/fnb.service';
import { useStore } from '@/hooks/useStore';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '🔴 Order Masuk', color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.08)' },
  preparing: { label: '🟡 Sedang Dimasak', color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.08)' },
  ready: { label: '🟢 Siap Disajikan', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.08)' },
};

// ── Kitchen Ticket Print ─────────────────────────────────────────────────────
function printKitchenTicket(order: FnbOrder, storeName?: string) {
  const orderType = (order as any).orderType || (order as any).order_type || '';
  const typeLabel = orderType === 'dine-in' ? 'Dine-in' : orderType === 'takeaway' ? 'Takeaway' : orderType === 'delivery' ? 'Delivery' : orderType;
  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' });
  const orderTime = order.createdAt
    ? new Date(order.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' })
    : now;

  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding:3px 0;font-size:15px;font-weight:700;">${item.quantity}×</td>
      <td style="padding:3px 0 3px 8px;font-size:15px;font-weight:700;">${item.productName || 'Item'}</td>
    </tr>
    ${item.notes ? `<tr><td></td><td style="padding:0 0 4px 8px;font-size:12px;color:#555;">📝 ${item.notes}</td></tr>` : ''}
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Struk Dapur — ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; width: 80mm; padding: 8px; background: white; color: black; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .divider { border-top: 2px dashed #000; margin: 8px 0; }
    .divider-solid { border-top: 2px solid #000; margin: 8px 0; }
    .header-title { font-size: 20px; font-weight: 900; letter-spacing: 1px; }
    .order-num { font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 6px 0; }
    .badge { display: inline-block; border: 2px solid #000; padding: 2px 10px; font-size: 13px; font-weight: 700; border-radius: 4px; margin: 4px 0; }
    .table-info { font-size: 22px; font-weight: 900; margin: 6px 0; }
    .meta { font-size: 12px; color: #333; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; }
    .items-header { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; padding-bottom: 4px; }
    .notes-box { border: 2px solid #000; padding: 6px 8px; margin-top: 8px; border-radius: 4px; }
    .notes-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .notes-text { font-size: 13px; margin-top: 3px; }
    .footer { font-size: 11px; color: #555; margin-top: 6px; }
    @media print {
      body { width: 80mm; }
      @page { margin: 0; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="center">
    ${storeName ? `<div style="font-size:13px;font-weight:700;margin-bottom:2px;">${storeName}</div>` : ''}
    <div class="header-title">🍳 STRUK DAPUR</div>
    <div class="divider-solid"></div>
    <div class="order-num">#${order.orderNumber}</div>
    <div class="badge">${typeLabel.toUpperCase()}</div>
    ${order.tableName ? `<div class="table-info">🪑 MEJA ${order.tableName}</div>` : ''}
    ${order.customerName ? `<div class="meta">👤 ${order.customerName}</div>` : ''}
    <div class="meta">Order: ${orderTime}</div>
    <div class="meta">Print: ${now}</div>
  </div>

  <div class="divider"></div>

  <div class="items-header">ITEM PESANAN</div>
  <table>
    <tbody>${itemsHtml}</tbody>
  </table>

  ${order.notes ? `
  <div class="divider"></div>
  <div class="notes-box">
    <div class="notes-label">📝 Catatan Order</div>
    <div class="notes-text">${order.notes}</div>
  </div>` : ''}

  <div class="divider"></div>
  <div class="center footer">— Segera diproses —</div>
</body>
</html>`;

  // Gunakan Blob URL agar tidak pakai document.write yang deprecated
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'width=400,height=600');
  if (!win) { alert('Popup diblokir. Izinkan popup untuk mencetak struk.'); URL.revokeObjectURL(url); return; }
  win.focus();
  setTimeout(() => { win.print(); setTimeout(() => { win.close(); URL.revokeObjectURL(url); }, 500); }, 500);
}

const POLL_INTERVAL = 5000;

// Map raw backend order (snake_case) to FnbOrder (camelCase)
// Used for SSE data which bypasses fnbService.mapOrder
function mapRawOrder(raw: any): FnbOrder {
  const tx = raw.transaction;
  // Items bisa dari transaction.items (via transaction join) atau raw.items
  const rawItems = tx?.items || raw.items || [];
  return {
    id: raw.id,
    companyId: raw.company_id || raw.companyId,
    storeId: raw.store_id || raw.storeId,
    orderNumber: raw.order_number || raw.orderNumber,
    orderType: raw.order_type || raw.orderType,
    tableId: raw.table_id || raw.tableId,
    tableName: raw.table?.table_number || raw.table?.table_name || raw.tableName,
    customerId: tx?.customerId || tx?.customer_id || raw.customerId,
    customerName: tx?.customerName || tx?.customer_name || raw.customerName,
    status: raw.status,
    items: rawItems.map((i: any) => ({
      id: i.id,
      productId: i.productId || i.product_id,
      productName: i.productName || i.product_name || 'Item',
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice || i.unit_price || 0),
      subtotal: Number(i.subtotal || 0),
      notes: i.notes,
    })),
    subtotal: Number(tx?.subtotal || raw.subtotal || 0),
    tax: Number(tx?.taxAmount || tx?.tax_amount || raw.tax || 0),
    total: Number(tx?.total || raw.total || 0),
    notes: raw.notes,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

export default function KDSPage() {
  const { storeId, stores } = useStore();
  const [orders, setOrders] = useState<FnbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [useSSE, setUseSSE] = useState(false);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const sseRef = useRef<EventSource | null>(null);

  const processOrders = useCallback((data: any) => {
    // data bisa berupa:
    // 1. FnbOrder[] (sudah di-map, dari fetchOrders via fnbService)
    // 2. Raw backend response { pending, preparing, ready } (dari SSE, belum di-map) 
    let newOrders: FnbOrder[] = [];
    if (Array.isArray(data)) {
      // Cek apakah sudah di-map (punya orderNumber) atau masih raw (punya order_number)
      newOrders = data.map((o: any) => o.orderNumber ? o : mapRawOrder(o));
    } else if (data && typeof data === 'object') {
      const raw = [
        ...(data.pending || []),
        ...(data.preparing || []),
        ...(data.ready || []),
      ];
      newOrders = raw.map((o: any) => o.orderNumber ? o : mapRawOrder(o));
    }

    const newIds = new Set(newOrders.map((o: FnbOrder) => o.id));
    const addedIds = [...newIds].filter(id => !prevOrderIdsRef.current.has(id));
    if (addedIds.length > 0 && prevOrderIdsRef.current.size > 0) {
      toast(`🔔 ${addedIds.length} order baru masuk!`, {
        duration: 4000,
        style: { background: 'var(--danger)', color: 'white', fontWeight: 600 },
      });
    }
    prevOrderIdsRef.current = newIds;
    setOrders(newOrders);
    setLastUpdated(new Date());
    setIsConnected(true);
    setLoading(false);
    setCountdown(POLL_INTERVAL / 1000);
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!storeId) return;
    try {
      const data = await fnbService.getKitchenDisplay(storeId);
      processOrders(data);
    } catch (err) {
      console.error('KDS fetch error:', err);
      setIsConnected(false);
      setLoading(false);
    }
  }, [storeId, processOrders]);

  // Try SSE first, fallback to polling
  useEffect(() => {
    if (!storeId) return;

    const token = localStorage.getItem('access_token') || '';
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1');
    const sseUrl = `${apiBase}/fnb/orders/kitchen-display/stream?store_id=${storeId}`;

    // Initial fetch
    fetchOrders();

    // Try SSE
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${sseUrl}&token=${token}`);
      sseRef.current = es;

      es.onopen = () => {
        setUseSSE(true);
        setIsConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          processOrders(data);
        } catch {}
      };

      es.onerror = () => {
        // SSE failed, fallback to polling
        es?.close();
        sseRef.current = null;
        setUseSSE(false);
        setIsConnected(false);
        // Retry fetch via polling
        fetchOrders();
      };
    } catch {
      // SSE not supported, use polling
      setUseSSE(false);
    }

    return () => {
      es?.close();
      sseRef.current = null;
    };
  }, [storeId, fetchOrders]);

  // Polling fallback when SSE not available
  useEffect(() => {
    if (useSSE || !storeId) return;
    const interval = setInterval(fetchOrders, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [useSSE, storeId, fetchOrders]);

  // Countdown timer
  useEffect(() => {
    if (useSSE) return;
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? POLL_INTERVAL / 1000 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [useSSE]);

  const moveOrder = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await fnbService.updateOrderStatus(orderId, newStatus);
      // Jika status adalah served/cancelled, hapus dari KDS langsung
      // KDS hanya tampilkan pending/preparing/ready
      if (newStatus === OrderStatus.SERVED || newStatus === OrderStatus.CANCELLED) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      } else {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      }
      const labels: Record<string, string> = {
        preparing: '🟡 Mulai dimasak',
        ready: '🟢 Siap disajikan',
        served: '✅ Sudah disajikan — order selesai',
        cancelled: '❌ Dibatalkan',
      };
      toast.success(labels[newStatus] || `Status: ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal update status');
      // Refresh dari server jika gagal untuk sinkronisasi
      fetchOrders();
    }
  };

  const getElapsed = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff < 1) return 'Baru masuk';
    if (diff === 1) return '1 mnt lalu';
    return `${diff} mnt lalu`;
  };

  const isUrgent = (createdAt: string) =>
    (Date.now() - new Date(createdAt).getTime()) > 10 * 60 * 1000;

  const columns = ['pending', 'preparing', 'ready'] as const;

  if (!storeId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <ChefHat size={48} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Pilih toko terlebih dahulu</p>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>KDS membutuhkan toko aktif untuk menampilkan order dapur</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid var(--border-base)', borderTopColor: 'var(--accent-base)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto var(--space-md)' }} />
        <p style={{ color: 'var(--text-tertiary)' }}>Memuat Kitchen Display...</p>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ChefHat size={28} color="var(--warning)" /> Kitchen Display System
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: isConnected ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isConnected ? (useSSE ? 'Real-time' : 'Live') : 'Terputus – cek koneksi'}
            </span>
            <span>🏪 {stores.find(s => s.id === storeId)?.name || 'Toko'}</span>
            {lastUpdated && <span>Update: {lastUpdated.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}</span>}
            {useSSE ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontSize: '0.8rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                SSE aktif
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Refresh {countdown}s
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {columns.map(s => (
              <div key={s} style={{ textAlign: 'center', padding: '6px 14px', background: `${STATUS_CONFIG[s].color}15`, borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: STATUS_CONFIG[s].color }}>{orders.filter(o => o.status === s).length}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{s}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-outline" onClick={fetchOrders}>
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Alur FnB */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-lg)', flexWrap: 'wrap', padding: '10px 14px', background: 'rgba(99,102,241,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginRight: 4 }}>Alur:</span>
        {[
          { icon: '📋', label: 'Pelayan buat order', color: '#6366f1' },
          { icon: '→', label: '', color: '#9ca3af' },
          { icon: '🔴', label: 'KDS: Order Masuk', color: '#ef4444' },
          { icon: '→', label: '', color: '#9ca3af' },
          { icon: '🟡', label: 'Mulai Masak', color: '#f59e0b' },
          { icon: '→', label: '', color: '#9ca3af' },
          { icon: '🟢', label: 'Siap Disajikan', color: '#10b981' },
          { icon: '→', label: '', color: '#9ca3af' },
          { icon: '✅', label: 'Disajikan', color: '#8b5cf6' },
          { icon: '→', label: '', color: '#9ca3af' },
          { icon: '💳', label: 'POS: Checkout', color: '#6366f1' },
        ].map((s, i) => (
          <span key={i} style={{ fontSize: '0.78rem', color: s.color, fontWeight: s.label ? 500 : 400 }}>
            {s.icon} {s.label}
          </span>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <ChefHat size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Tidak ada order dapur aktif</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: 4 }}>
            Order akan muncul di sini saat pelayan membuat order FnB dari menu <strong>FnB → Orders</strong>
          </p>
        </div>
      )}

      {/* Kanban Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)', minHeight: '60vh' }}>
        {columns.map(status => {
          const config = STATUS_CONFIG[status];
          const columnOrders = orders.filter(o => o.status === status);

          return (
            <div key={status} style={{ background: config.bg, borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)', border: `1px solid ${config.color}30` }}>
              <div className="flex-between" style={{ marginBottom: 'var(--space-md)', padding: '0 var(--space-xs)' }}>
                <h2 style={{ fontSize: '1rem', color: config.color, fontWeight: 700 }}>{config.label}</h2>
                <span style={{ background: `${config.color}20`, color: config.color, padding: '2px 10px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700 }}>{columnOrders.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {columnOrders.length === 0 && (
                  <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Tidak ada order
                  </div>
                )}
                {columnOrders.map(order => {
                  const urgent = isUrgent(order.createdAt);
                  const orderType = (order as any).orderType || (order as any).order_type || '';
                  const typeEmoji = orderType === 'dine-in' ? '🪑' : orderType === 'takeaway' ? '🥡' : orderType === 'delivery' ? '🛵' : '📋';

                  return (
                    <div key={order.id} className="glass-panel animate-fade-in" style={{
                      padding: 'var(--space-md)', margin: 0,
                      border: urgent ? '2px solid var(--danger)' : '1px solid var(--border-subtle)',
                      background: urgent ? 'rgba(239,68,68,0.03)' : 'var(--bg-primary)',
                    }}>
                      {/* Order header */}
                      <div className="flex-between" style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {urgent && <Flame size={14} style={{ color: 'var(--danger)' }} />}
                          {typeEmoji} #{order.orderNumber}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: urgent ? 'var(--danger)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3, fontWeight: urgent ? 700 : 400 }}>
                          <Clock size={11} /> {getElapsed(order.createdAt)}
                        </div>
                      </div>

                      {/* Table / type info */}
                      {order.tableName && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: 6, fontWeight: 600 }}>
                          🪑 Meja {order.tableName}
                        </div>
                      )}
                      {order.customerName && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                          👤 {order.customerName}
                        </div>
                      )}

                      {/* Items */}
                      <div style={{ marginBottom: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                        {(order.items || []).length === 0 ? (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Tidak ada item</div>
                        ) : (
                          (order.items || []).map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '2px 0', color: 'var(--text-secondary)' }}>
                              <span style={{ fontWeight: 500 }}>{item.quantity}× {item.productName || 'Item'}</span>
                              {item.notes && <span style={{ color: 'var(--warning)', fontSize: '0.72rem' }}>📝 {item.notes}</span>}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--warning)', marginBottom: 8, padding: '4px 8px', background: 'rgba(245,158,11,0.08)', borderRadius: 4 }}>
                          📝 {order.notes}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {status === 'pending' && (
                          <button className="btn btn-primary" style={{ flex: 1, padding: '7px', fontSize: '0.82rem', background: 'var(--warning)', border: 'none' }}
                            onClick={() => moveOrder(order.id, OrderStatus.PREPARING)}>
                            <Flame size={13} style={{ marginRight: 4 }} /> Mulai Masak
                          </button>
                        )}
                        {status === 'preparing' && (
                          <button className="btn btn-primary" style={{ flex: 1, padding: '7px', fontSize: '0.82rem', background: 'var(--success)', border: 'none' }}
                            onClick={() => moveOrder(order.id, OrderStatus.READY)}>
                            <CheckCircle2 size={13} style={{ marginRight: 4 }} /> Tandai Siap
                          </button>
                        )}
                        {status === 'ready' && (
                          <button className="btn btn-primary" style={{ flex: 1, padding: '7px', fontSize: '0.82rem', background: 'var(--primary)', border: 'none' }}
                            onClick={() => moveOrder(order.id, OrderStatus.SERVED)}>
                            <CheckCircle2 size={13} style={{ marginRight: 4 }} /> Sudah Disajikan
                          </button>
                        )}
                        <button
                          title="Print struk dapur"
                          style={{ padding: '7px 10px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
                          onClick={() => printKitchenTicket(order, stores.find(s => s.id === storeId)?.name)}
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}} />
    </div>
  );
}
