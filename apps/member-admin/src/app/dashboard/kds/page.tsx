"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChefHat, Clock, CheckCircle2, RefreshCcw, Flame, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { fnbService, FnbOrder, OrderStatus } from '@/services/fnb.service';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '🔴 New Orders', color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.08)' },
  preparing: { label: '🟡 In Progress', color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.08)' },
  ready: { label: '🟢 Ready', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.08)' },
};

const POLL_INTERVAL = 5000; // 5s — faster than before

export default function KDSPage() {
  const { company } = useAuth();
  const [orders, setOrders] = useState<FnbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    try {
      const data = await fnbService.getKitchenDisplay();
      const newOrders: FnbOrder[] = Array.isArray(data) ? data : [];

      // Detect new orders and play notification
      const newIds = new Set(newOrders.map(o => o.id));
      const addedIds = [...newIds].filter(id => !prevOrderIdsRef.current.has(id));
      if (addedIds.length > 0 && prevOrderIdsRef.current.size > 0) {
        toast(`🔔 ${addedIds.length} new order${addedIds.length > 1 ? 's' : ''} received!`, {
          duration: 4000,
          style: { background: 'var(--danger)', color: 'white', fontWeight: 600 },
        });
      }
      prevOrderIdsRef.current = newIds;

      setOrders(newOrders);
      setLastUpdated(new Date());
      setIsConnected(true);
    } catch (err) {
      console.error('Failed to load KDS orders:', err);
      setIsConnected(false);
    } finally {
      setLoading(false);
      setCountdown(POLL_INTERVAL / 1000);
    }
  }, []);

  // Polling with countdown
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? POLL_INTERVAL / 1000 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const moveOrder = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await fnbService.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order moved to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update order status');
    }
  };

  // Calculate elapsed time for each order
  const getElapsed = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff === 1) return '1 min ago';
    return `${diff} mins ago`;
  };

  const isUrgent = (createdAt: string) => {
    return (Date.now() - new Date(createdAt).getTime()) > 10 * 60 * 1000; // > 10 min
  };

  const columns = ['pending', 'preparing', 'ready'] as const;

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid var(--border-base)', borderTopColor: 'var(--accent-base)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto var(--space-md)' }} />
        <p style={{ color: 'var(--text-tertiary)' }}>Loading Kitchen Display...</p>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ChefHat size={28} color="var(--warning)" /> Kitchen Display System
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: isConnected ? 'var(--success)' : 'var(--danger)' }}>
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
            {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}</span>}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              Refreshing in {countdown}s
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {columns.map(s => (
              <div key={s} style={{ textAlign: 'center', padding: '6px 12px', background: `${STATUS_CONFIG[s].color}15`, borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: STATUS_CONFIG[s].color }}>{orders.filter(o => o.status === s).length}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{s}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-outline" onClick={fetchOrders}>
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <AlertCircle size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No active kitchen orders. Orders will appear here when FnB orders are placed.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)', minHeight: '60vh' }}>
        {columns.map(status => {
          const config = STATUS_CONFIG[status];
          const columnOrders = orders.filter(o => o.status === status);

          return (
            <div key={status} style={{ background: config.bg, borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)', border: `1px solid ${config.color}22` }}>
              <div className="flex-between" style={{ marginBottom: 'var(--space-md)', padding: '0 var(--space-xs)' }}>
                <h2 style={{ fontSize: '1.1rem', color: config.color, fontWeight: 700 }}>{config.label}</h2>
                <span className="badge" style={{ background: `${config.color}20`, color: config.color }}>{columnOrders.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {columnOrders.length === 0 && (
                  <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                    No orders
                  </div>
                )}
                {columnOrders.map(order => {
                  const urgent = isUrgent(order.createdAt);
                  return (
                    <div key={order.id} className="glass-panel animate-fade-in" style={{ padding: 'var(--space-md)', margin: 0, border: urgent ? '1px solid var(--danger)' : undefined }}>
                      <div className="flex-between" style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {urgent && <Flame size={14} style={{ color: 'var(--danger)' }} />}
                          #{order.orderNumber}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: urgent ? 'var(--danger)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: urgent ? 600 : 400 }}>
                          <Clock size={12} /> {getElapsed(order.createdAt)}
                        </div>
                      </div>

                      {order.tableName && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-base)', marginBottom: '6px', fontWeight: 600 }}>
                          🪑 Table: {order.tableName}
                        </div>
                      )}

                      <div style={{ marginBottom: '12px' }}>
                        {(order.items || []).map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '2px 0', color: 'var(--text-secondary)' }}>
                            <span>{item.quantity}x {item.productName || 'Item'}</span>
                            {item.notes && <span style={{ color: 'var(--warning)', fontSize: '0.75rem' }}>📝 {item.notes}</span>}
                          </div>
                        ))}
                      </div>

                      {order.customerName && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                          👤 {order.customerName}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {status === 'pending' && (
                          <button className="btn btn-primary" style={{ flex: 1, padding: '6px', fontSize: '0.85rem', background: 'var(--warning)' }}
                            onClick={() => moveOrder(order.id, OrderStatus.PREPARING)}>
                            <Flame size={14} style={{ marginRight: '4px' }} /> Start Cooking
                          </button>
                        )}
                        {status === 'preparing' && (
                          <button className="btn btn-primary" style={{ flex: 1, padding: '6px', fontSize: '0.85rem', background: 'var(--success)' }}
                            onClick={() => moveOrder(order.id, OrderStatus.READY)}>
                            <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> Mark Ready
                          </button>
                        )}
                        {status === 'ready' && (
                          <button className="btn btn-primary" style={{ flex: 1, padding: '6px', fontSize: '0.85rem' }}
                            onClick={() => moveOrder(order.id, OrderStatus.SERVED)}>
                            <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> Mark Served
                          </button>
                        )}
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
