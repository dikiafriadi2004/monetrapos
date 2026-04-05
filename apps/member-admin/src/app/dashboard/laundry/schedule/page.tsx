'use client';

import { useState, useEffect } from 'react';
import { laundryService } from '@/services/laundry.service';
import { Calendar, Loader2, ChevronLeft, ChevronRight, Truck, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LaundrySchedulePage() {
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadSchedule(); }, [selectedDate]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const res = await laundryService.getSchedule(undefined, selectedDate);
      setSchedule(res);
    } catch {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const fmt = (n: number) => `Rp ${n?.toLocaleString('id-ID') || 0}`;

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Laundry Schedule</h1>
        <p style={{ color: 'var(--text-secondary)' }}>View pickup and delivery schedule by date</p>
      </div>

      {/* Date Selector */}
      <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)' }}>
        <button onClick={() => changeDate(-1)} className="btn btn-outline" style={{ height: 36, width: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <input
            type="date"
            className="form-input"
            style={{ width: 180 }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <button onClick={() => changeDate(1)} className="btn btn-outline" style={{ height: 36, width: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          {/* Pickups */}
          <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-lg)' }}>
              <Package size={20} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Pickups ({schedule?.pickups?.length || 0})</h2>
            </div>
            {schedule?.pickups?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {schedule.pickups.map((order: any) => (
                  <OrderCard key={order.id} order={order} type="pickup" fmt={fmt} />
                ))}
              </div>
            ) : (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No pickups scheduled
              </div>
            )}
          </div>

          {/* Deliveries */}
          <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-lg)' }}>
              <Truck size={20} style={{ color: 'var(--success)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Deliveries ({schedule?.deliveries?.length || 0})</h2>
            </div>
            {schedule?.deliveries?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {schedule.deliveries.map((order: any) => (
                  <OrderCard key={order.id} order={order} type="delivery" fmt={fmt} />
                ))}
              </div>
            ) : (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No deliveries scheduled
              </div>
            )}
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

function OrderCard({ order, type, fmt }: { order: any; type: 'pickup' | 'delivery'; fmt: (n: number) => string }) {
  const color = type === 'pickup' ? 'var(--primary)' : 'var(--success)';
  return (
    <div style={{ padding: 'var(--space-md)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{order.orderNumber}</span>
        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 10, background: `${color}20`, color, fontWeight: 600, textTransform: 'capitalize' }}>
          {type}
        </span>
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{order.customerName || 'Walk-in'}</div>
      {order.serviceTypeName && <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>🧺 {order.serviceTypeName}</div>}
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)', marginTop: 4 }}>{fmt(order.totalPrice)}</div>
    </div>
  );
}
