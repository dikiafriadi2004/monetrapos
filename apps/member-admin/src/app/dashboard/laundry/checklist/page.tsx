'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Loader2, X, ClipboardCheck, Shirt } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

const ITEM_TYPES = ['shirt', 'pants', 'dress', 'jacket', 'skirt', 'bedsheet', 'blanket', 'curtain', 'towel', 'other'];

interface LaundryItem {
  id: string;
  item_type: string;
  description?: string;
  color?: string;
  brand?: string;
  quantity: number;
  barcode?: string;
  notes?: string;
}

interface LaundryOrder {
  id: string;
  order_number: string;
  status: string;
  customer?: { name: string };
  items?: LaundryItem[];
  item_count: number;
}

const emptyItem = { item_type: 'shirt', description: '', color: '', brand: '', quantity: 1, barcode: '', notes: '' };

export default function LaundryChecklistPage() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<LaundryOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [saving, setSaving] = useState(false);

  const loadOrder = async () => {
    if (!orderId.trim()) { toast.error('Enter an order ID'); return; }
    setLoading(true);
    try {
      const res: any = await apiClient.get(`/laundry/orders/${orderId}`);
      const data = res?.data || res;
      setOrder(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Order not found');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!order) return;
    setSaving(true);
    try {
      await apiClient.post(`/laundry/orders/${order.id}/items`, {
        items: [itemForm],
      });
      toast.success('Item added to checklist');
      setShowAddModal(false);
      setItemForm(emptyItem);
      await loadOrder();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      received: '#6b7280', washing: '#3b82f6', drying: '#f59e0b',
      ironing: '#8b5cf6', ready: '#10b981', delivered: '#059669', cancelled: '#ef4444',
    };
    return map[status] || '#6b7280';
  };

  const getItemTypeEmoji = (type: string) => {
    const map: Record<string, string> = {
      shirt: '👕', pants: '👖', dress: '👗', jacket: '🧥', skirt: '👗',
      bedsheet: '🛏️', blanket: '🛌', curtain: '🪟', towel: '🧺', other: '📦',
    };
    return map[type] || '📦';
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Item Checklist</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track and manage items in a laundry order</p>
      </div>

      {/* Search Order */}
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Load Order</h3>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Enter Order ID..."
            value={orderId}
            onChange={e => setOrderId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadOrder()}
          />
          <button onClick={loadOrder} disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
            Load
          </button>
        </div>
      </div>

      {order && (
        <>
          {/* Order Info */}
          <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{order.order_number}</h3>
                {order.customer && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Customer: {order.customer.name}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, background: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status), textTransform: 'capitalize' }}>
                  {order.status}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{order.items?.length || 0} items</span>
                <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ height: 36, padding: '0 16px', fontSize: '0.85rem' }}>
                  <Plus size={14} /> Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Items Checklist */}
          {!order.items || order.items.length === 0 ? (
            <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
              <ClipboardCheck size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>No items in checklist yet</p>
              <button onClick={() => setShowAddModal(true)} className="btn btn-primary"><Plus size={16} /> Add First Item</button>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: 0 }}>
              <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardCheck size={18} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 600 }}>Items ({order.items.length})</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {['#', 'Type', 'Description', 'Color', 'Brand', 'Qty', 'Barcode', 'Notes'].map(h => (
                        <th key={h} style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: 'var(--space-sm) var(--space-md)', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{idx + 1}</td>
                        <td style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                            {getItemTypeEmoji(item.item_type)} {item.item_type}
                          </span>
                        </td>
                        <td style={{ padding: 'var(--space-sm) var(--space-md)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.description || '-'}</td>
                        <td style={{ padding: 'var(--space-sm) var(--space-md)', fontSize: '0.9rem' }}>
                          {item.color ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 12, height: 12, borderRadius: '50%', background: item.color, border: '1px solid var(--border-subtle)', display: 'inline-block' }} />
                              {item.color}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: 'var(--space-sm) var(--space-md)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.brand || '-'}</td>
                        <td style={{ padding: 'var(--space-sm) var(--space-md)', fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ padding: 'var(--space-sm) var(--space-md)', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{item.barcode || '-'}</td>
                        <td style={{ padding: 'var(--space-sm) var(--space-md)', color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: 200 }}>{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowAddModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 500, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Add Item to Checklist</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Item Type *</label>
                <select className="form-input" value={itemForm.item_type} onChange={e => setItemForm(p => ({ ...p, item_type: e.target.value }))}>
                  {ITEM_TYPES.map(t => <option key={t} value={t}>{getItemTypeEmoji(t)} {t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input type="number" className="form-input" value={itemForm.quantity} onChange={e => setItemForm(p => ({ ...p, quantity: Number(e.target.value) }))} min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Long sleeve" />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <input className="form-input" value={itemForm.color} onChange={e => setItemForm(p => ({ ...p, color: e.target.value }))} placeholder="e.g. White, Blue" />
              </div>
              <div className="form-group">
                <label className="form-label">Brand</label>
                <input className="form-input" value={itemForm.brand} onChange={e => setItemForm(p => ({ ...p, brand: e.target.value }))} placeholder="e.g. Uniqlo" />
              </div>
              <div className="form-group">
                <label className="form-label">Barcode</label>
                <input className="form-input" value={itemForm.barcode} onChange={e => setItemForm(p => ({ ...p, barcode: e.target.value }))} placeholder="Scan or enter barcode" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notes</label>
                <input className="form-input" value={itemForm.notes} onChange={e => setItemForm(p => ({ ...p, notes: e.target.value }))} placeholder="Special instructions..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setShowAddModal(false)} className="btn btn-outline">Cancel</button>
              <button onClick={addItem} className="btn btn-primary" disabled={saving}>
                {saving ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
