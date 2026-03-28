"use client";

import { useState, useEffect, useCallback } from 'react';
import { ChefHat, Clock, CheckCircle2, RefreshCcw, Flame } from 'lucide-react';
import { api } from '../../../lib/api';

type OrderStatus = 'PENDING' | 'PREPARING' | 'COMPLETED';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: '🔴 New Orders', color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.08)' },
  PREPARING: { label: '🟡 In Progress', color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.08)' },
  COMPLETED: { label: '🟢 Done', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.08)' },
};

export default function KDSPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      // Fetch recent transactions – in a real app this filters by today + uncompleted
      const storesRes: any = await api.get('/stores');
      const storeId = storesRes[0]?.id;
      if (!storeId) return;
      
      const data: any = await api.get(`/transactions?storeId=${storeId}&limit=30`);
      // Map transactions to KDS orders with a status field
      // Since the backend doesn't have a status column yet, we simulate it
      const mapped = (data?.data || data || []).map((tx: any, idx: number) => ({
        ...tx,
        kdsStatus: tx.kdsStatus || (idx < 2 ? 'PENDING' : idx < 5 ? 'PREPARING' : 'COMPLETED') as OrderStatus,
      }));
      setOrders(mapped);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const moveOrder = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, kdsStatus: newStatus } : o));
    // In production: api.patch(`/transactions/${orderId}/status`, { status: newStatus });
  };

  const columns: OrderStatus[] = ['PENDING', 'PREPARING', 'COMPLETED'];

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading Kitchen Display...</div>;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ChefHat size={28} color="var(--warning)" /> Kitchen Display System
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time order queue for kitchen staff. Auto-refreshes every 10s.</p>
        </div>
        <button className="btn btn-outline" onClick={fetchOrders}>
          <RefreshCcw size={16} style={{ marginRight: '6px' }} /> Refresh Now
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)', minHeight: '60vh' }}>
        {columns.map(status => {
          const config = STATUS_CONFIG[status];
          const columnOrders = orders.filter(o => o.kdsStatus === status);
          
          return (
            <div key={status} style={{ background: config.bg, borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)', border: `1px solid ${config.color}22` }}>
              <div className="flex-between" style={{ marginBottom: 'var(--space-md)', padding: '0 var(--space-xs)' }}>
                <h2 style={{ fontSize: '1.1rem', color: config.color, fontWeight: 700 }}>{config.label}</h2>
                <span className="badge" style={{ background: `${config.color}20`, color: config.color }}>{columnOrders.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {columnOrders.length === 0 && (
                  <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                    No orders in this queue
                  </div>
                )}
                {columnOrders.map(order => (
                  <div key={order.id} className="glass-panel animate-fade-in" style={{ padding: 'var(--space-md)', margin: 0 }}>
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                        #{order.invoiceNumber || order.id?.substring(0, 8)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                    </div>

                    {/* Items */}
                    <div style={{ marginBottom: '12px' }}>
                      {(order.items || []).slice(0, 5).map((item: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '2px 0', color: 'var(--text-secondary)' }}>
                          <span>{item.quantity}x {item.productName}</span>
                          {item.notes && <span style={{ color: 'var(--warning)', fontSize: '0.75rem' }}>📝 {item.notes}</span>}
                        </div>
                      ))}
                    </div>

                    {order.customerName && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Customer: {order.customerName}</div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {status === 'PENDING' && (
                        <button className="btn btn-primary" style={{ flex: 1, padding: '6px', fontSize: '0.85rem', background: 'var(--warning)' }} onClick={() => moveOrder(order.id, 'PREPARING')}>
                          <Flame size={14} style={{ marginRight: '4px' }} /> Start Cooking
                        </button>
                      )}
                      {status === 'PREPARING' && (
                        <button className="btn btn-primary" style={{ flex: 1, padding: '6px', fontSize: '0.85rem', background: 'var(--success)' }} onClick={() => moveOrder(order.id, 'COMPLETED')}>
                          <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> Mark Done
                        </button>
                      )}
                      {status === 'COMPLETED' && (
                        <div style={{ textAlign: 'center', width: '100%', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                          ✓ Served
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
