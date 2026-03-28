"use client";

import { useState, useEffect } from 'react';
import { Warehouse, Plus, ArrowDownToLine, ArrowUpFromLine, RotateCcw, Filter, Package } from 'lucide-react';
import { api } from '../../../lib/api';

const MOVEMENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  IN: { label: 'Stock In', color: 'var(--success)', icon: '↓' },
  OUT: { label: 'Stock Out', color: 'var(--danger)', icon: '↑' },
  SALE: { label: 'Sale', color: 'var(--warning)', icon: '⚡' },
  ADJUSTMENT: { label: 'Adjustment', color: '#38bdf8', icon: '⟳' },
  RETURN: { label: 'Return', color: '#8b5cf6', icon: '↩' },
};

export default function InventoryPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ type: 'IN', quantity: '', productId: '', storeId: '', reason: '', reference: '' });
  const [saving, setSaving] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storesRes: any = await api.get('/stores');
      const storeId = storesRes[0]?.id || '';
      setActiveStoreId(storeId);

      const [movRes, prodRes]: any = await Promise.all([
        api.get(`/inventory/movements?storeId=${storeId}`),
        api.get('/products')
      ]);
      setMovements(movRes || []);
      setProducts(prodRes || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/inventory/movements', {
        ...formData,
        quantity: parseInt(formData.quantity as string) || 1,
        storeId: activeStoreId
      });
      setIsModalOpen(false);
      setFormData({ type: 'IN', quantity: '', productId: '', storeId: '', reason: '', reference: '' });
      await fetchData();
    } catch (err: any) { alert(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Stock Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track every stock movement and perform manual adjustments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ background: 'var(--success)' }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Record Movement
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {['IN', 'OUT', 'SALE', 'RETURN'].map(type => {
          const info = MOVEMENT_LABELS[type];
          const count = movements.filter(m => m.type === type).length;
          return (
            <div key={type} className="glass-panel" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{info.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: info.color }}>{count}</div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{info.label} Records</div>
            </div>
          );
        })}
      </div>

      {/* Movement Log Table */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 2fr 1.5fr', gap: 'var(--space-md)', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
          <div>Type</div><div>Product</div><div>Qty</div><div>Stock After</div><div>Reason</div><div>Date</div>
        </div>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
          ) : movements.length === 0 ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No stock movements recorded yet.</div>
          ) : movements.map(m => {
            const info = MOVEMENT_LABELS[m.type] || { label: m.type, color: 'var(--text-secondary)', icon: '?' };
            return (
              <div key={m.id} className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 2fr 1.5fr', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                <div><span className="badge" style={{ background: `${info.color}20`, color: info.color }}>{info.label}</span></div>
                <div style={{ fontWeight: 500 }}>{m.product?.name || m.productId}</div>
                <div style={{ fontWeight: 600, color: ['IN', 'RETURN'].includes(m.type) ? 'var(--success)' : 'var(--danger)' }}>
                  {['IN', 'RETURN'].includes(m.type) ? '+' : '-'}{m.quantity}
                </div>
                <div>{m.stockAfter}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{m.reason || '-'}</div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Record Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '450px', padding: 'var(--space-xl)', background: '#111827' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Record Stock Movement</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Movement Type</label>
                <select className="form-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="IN">Stock In (Restock)</option>
                  <option value="OUT">Stock Out (Disposal/Loss)</option>
                  <option value="ADJUSTMENT">Manual Adjustment</option>
                  <option value="RETURN">Customer Return</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Product</label>
                <select className="form-input" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})} required>
                  <option value="">Select a product...</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Quantity</label>
                <input type="number" className="form-input" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required min="1" />
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Reason / Notes</label>
                <input type="text" className="form-input" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="e.g. Weekly restock from supplier" />
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">Reference (Optional)</label>
                <input type="text" className="form-input" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="Invoice # or PO #" />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--success)' }} disabled={saving}>{saving ? 'Saving...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
