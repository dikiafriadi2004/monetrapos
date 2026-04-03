"use client";

import { useState, useEffect } from 'react';
import { Warehouse, Plus, ArrowDownToLine, ArrowUpFromLine, RotateCcw, Filter, Package, AlertTriangle, ArrowRightLeft, TrendingDown } from 'lucide-react';
import { api } from '../../../lib/api';

const MOVEMENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  IN: { label: 'Stock In', color: 'var(--success)', icon: '↓' },
  OUT: { label: 'Stock Out', color: 'var(--danger)', icon: '↑' },
  SALE: { label: 'Sale', color: 'var(--warning)', icon: '⚡' },
  ADJUSTMENT: { label: 'Adjustment', color: '#38bdf8', icon: '⟳' },
  RETURN: { label: 'Return', color: '#8b5cf6', icon: '↩' },
  TRANSFER: { label: 'Transfer', color: '#10b981', icon: '⇄' },
};

type ModalType = 'movement' | 'transfer' | 'lowStock' | null;

export default function InventoryPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'movements' | 'inventory' | 'lowStock'>('inventory');

  // Form
  const [modalType, setModalType] = useState<ModalType>(null);
  const [formData, setFormData] = useState({ type: 'IN', quantity: '', productId: '', storeId: '', reason: '', reference: '' });
  const [transferData, setTransferData] = useState({ fromStoreId: '', toStoreId: '', items: [{ productId: '', quantity: '' }], notes: '' });
  const [saving, setSaving] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState('');

  useEffect(() => { fetchData(); }, [activeStoreId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storesRes: any = await api.get('/stores');
      setStores(storesRes || []);
      const storeId = activeStoreId || storesRes[0]?.id || '';
      if (!activeStoreId) setActiveStoreId(storeId);

      const [movRes, prodRes, invRes, lowStockRes]: any = await Promise.all([
        api.get(`/inventory/movements?storeId=${storeId}`),
        api.get('/products'),
        api.get(`/inventory?storeId=${storeId}`),
        api.get(`/inventory/low-stock?storeId=${storeId}`)
      ]);
      setMovements(movRes || []);
      setProducts(prodRes || []);
      setInventory(invRes || []);
      setLowStockItems(lowStockRes || []);
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
      setModalType(null);
      setFormData({ type: 'IN', quantity: '', productId: '', storeId: '', reason: '', reference: '' });
      await fetchData();
    } catch (err: any) { alert(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/inventory/transfer', {
        fromStoreId: transferData.fromStoreId,
        toStoreId: transferData.toStoreId,
        items: transferData.items.map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity as string) || 1
        })),
        notes: transferData.notes
      });
      setModalType(null);
      setTransferData({ fromStoreId: '', toStoreId: '', items: [{ productId: '', quantity: '' }], notes: '' });
      await fetchData();
    } catch (err: any) { alert(err.message || 'Failed to transfer stock'); }
    finally { setSaving(false); }
  };

  const addTransferItem = () => {
    setTransferData({
      ...transferData,
      items: [...transferData.items, { productId: '', quantity: '' }]
    });
  };

  const removeTransferItem = (index: number) => {
    setTransferData({
      ...transferData,
      items: transferData.items.filter((_, i) => i !== index)
    });
  };

  const updateTransferItem = (index: number, field: string, value: string) => {
    const newItems = [...transferData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setTransferData({ ...transferData, items: newItems });
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Inventory Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track stock levels, movements, and manage inventory across stores.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <button className="btn btn-outline" onClick={() => setModalType('transfer')} style={{ borderColor: 'var(--primary)' }}>
            <ArrowRightLeft size={16} style={{ marginRight: '6px' }} /> Transfer Stock
          </button>
          <button className="btn btn-primary" onClick={() => setModalType('movement')} style={{ background: 'var(--success)' }}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Stock Adjustment
          </button>
        </div>
      </div>

      {/* Store Selector */}
      {stores.length > 1 && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label className="form-label">Select Store</label>
          <select 
            className="form-input" 
            value={activeStoreId} 
            onChange={(e) => setActiveStoreId(e.target.value)}
            style={{ maxWidth: '300px' }}
          >
            {stores.map((store: any) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="glass-panel" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>Low Stock Alert</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {lowStockItems.length} product{lowStockItems.length > 1 ? 's' : ''} running low on stock
                </p>
              </div>
            </div>
            <button 
              className="btn btn-outline" 
              onClick={() => setActiveTab('lowStock')}
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)', borderBottom: '2px solid var(--border-subtle)' }}>
        <button 
          onClick={() => setActiveTab('inventory')}
          style={{ 
            padding: 'var(--space-md)', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'inventory' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'inventory' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'inventory' ? 600 : 400,
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          <Package size={16} style={{ display: 'inline', marginRight: '6px' }} />
          Current Stock
        </button>
        <button 
          onClick={() => setActiveTab('movements')}
          style={{ 
            padding: 'var(--space-md)', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'movements' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'movements' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'movements' ? 600 : 400,
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          <RotateCcw size={16} style={{ display: 'inline', marginRight: '6px' }} />
          Movement History
        </button>
        <button 
          onClick={() => setActiveTab('lowStock')}
          style={{ 
            padding: 'var(--space-md)', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'lowStock' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'lowStock' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'lowStock' ? 600 : 400,
            cursor: 'pointer',
            marginBottom: '-2px',
            position: 'relative'
          }}
        >
          <TrendingDown size={16} style={{ display: 'inline', marginRight: '6px' }} />
          Low Stock Alerts
          {lowStockItems.length > 0 && (
            <span style={{ 
              position: 'absolute', 
              top: '8px', 
              right: '8px', 
              background: 'var(--danger)', 
              color: 'white', 
              borderRadius: '10px', 
              padding: '2px 6px', 
              fontSize: '0.7rem',
              fontWeight: 700
            }}>
              {lowStockItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Current Stock Tab */}
      {activeTab === 'inventory' && (
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 'var(--space-md)', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
            <div>Product</div><div>SKU</div><div>Available</div><div>Reserved</div><div>Min Stock</div>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
            ) : inventory.length === 0 ? (
              <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No inventory data available.</div>
            ) : inventory.map((item: any) => {
              const isLowStock = item.availableQuantity <= (item.product?.minStock || 0);
              return (
                <div key={item.id} className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.product?.name || 'Unknown'}</div>
                    {isLowStock && (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: '0.7rem', marginTop: '4px' }}>
                        Low Stock
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.product?.sku || '-'}</div>
                  <div style={{ fontWeight: 600, color: isLowStock ? 'var(--danger)' : 'var(--success)' }}>{item.availableQuantity}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{item.reservedQuantity || 0}</div>
                  <div style={{ color: 'var(--text-tertiary)' }}>{item.product?.minStock || 0}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Movement History Tab */}
      {activeTab === 'movements' && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
            {Object.keys(MOVEMENT_LABELS).map(type => {
              const info = MOVEMENT_LABELS[type];
              const count = movements.filter(m => m.type === type).length;
              return (
                <div key={type} className="glass-panel" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{info.icon}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: info.color }}>{count}</div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{info.label}</div>
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
        </>
      )}

      {/* Low Stock Alerts Tab */}
      {activeTab === 'lowStock' && (
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', gap: 'var(--space-md)', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
            <div>Product</div><div>SKU</div><div>Current Stock</div><div>Min Stock</div><div>Status</div>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
            ) : lowStockItems.length === 0 ? (
              <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <AlertTriangle size={48} style={{ color: 'var(--success)', marginBottom: 'var(--space-md)' }} />
                <p>All products are well stocked!</p>
              </div>
            ) : lowStockItems.map((item: any) => {
              const stockPercentage = (item.availableQuantity / item.product?.minStock) * 100;
              const isCritical = stockPercentage < 50;
              return (
                <div key={item.id} className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.product?.name || 'Unknown'}</div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.product?.sku || '-'}</div>
                  <div style={{ fontWeight: 600, color: isCritical ? 'var(--danger)' : 'var(--warning)' }}>{item.availableQuantity}</div>
                  <div style={{ color: 'var(--text-tertiary)' }}>{item.product?.minStock || 0}</div>
                  <div>
                    <span className="badge" style={{ background: isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.2)', color: isCritical ? 'var(--danger)' : 'var(--warning)' }}>
                      {isCritical ? 'Critical' : 'Low Stock'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {modalType === 'movement' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '450px', padding: 'var(--space-xl)', background: '#111827' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Stock Adjustment</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Adjustment Type</label>
                <select className="form-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="IN">Stock In (Restock/Purchase)</option>
                  <option value="OUT">Stock Out (Disposal/Loss/Damage)</option>
                  <option value="ADJUSTMENT">Manual Adjustment (Correction)</option>
                  <option value="RETURN">Customer Return</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Product *</label>
                <select className="form-input" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})} required>
                  <option value="">Select a product...</option>
                  {products.map((p: any) => {
                    const invItem = inventory.find((i: any) => i.productId === p.id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} (Current: {invItem?.availableQuantity || 0})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Quantity *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: e.target.value})} 
                  required 
                  min="1" 
                  placeholder="Enter quantity"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Reason / Notes *</label>
                <textarea 
                  className="form-input" 
                  value={formData.reason} 
                  onChange={e => setFormData({...formData, reason: e.target.value})} 
                  placeholder="e.g. Weekly restock from supplier, Damaged items, Stock count correction"
                  rows={3}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">Reference (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.reference} 
                  onChange={e => setFormData({...formData, reference: e.target.value})} 
                  placeholder="Invoice #, PO #, or other reference"
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModalType(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--success)' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Submit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {modalType === 'transfer' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '550px', padding: 'var(--space-xl)', background: '#111827', margin: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>Transfer Stock Between Stores</h2>
            <form onSubmit={handleTransferSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">From Store *</label>
                  <select 
                    className="form-input" 
                    value={transferData.fromStoreId} 
                    onChange={e => setTransferData({...transferData, fromStoreId: e.target.value})} 
                    required
                  >
                    <option value="">Select source store...</option>
                    {stores.map((store: any) => (
                      <option key={store.id} value={store.id} disabled={store.id === transferData.toStoreId}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To Store *</label>
                  <select 
                    className="form-input" 
                    value={transferData.toStoreId} 
                    onChange={e => setTransferData({...transferData, toStoreId: e.target.value})} 
                    required
                  >
                    <option value="">Select destination store...</option>
                    {stores.map((store: any) => (
                      <option key={store.id} value={store.id} disabled={store.id === transferData.fromStoreId}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label" style={{ marginBottom: 'var(--space-sm)' }}>Items to Transfer</label>
                {transferData.items.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                    <select 
                      className="form-input" 
                      value={item.productId} 
                      onChange={e => updateTransferItem(index, 'productId', e.target.value)}
                      required
                      style={{ flex: 2 }}
                    >
                      <option value="">Select product...</option>
                      {products.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={item.quantity} 
                      onChange={e => updateTransferItem(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                      required
                      min="1"
                      style={{ flex: 1 }}
                    />
                    {transferData.items.length > 1 && (
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={() => removeTransferItem(index)}
                        style={{ padding: '0 var(--space-md)', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={addTransferItem}
                  style={{ width: '100%', marginTop: 'var(--space-sm)' }}
                >
                  + Add Another Item
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">Transfer Notes (Optional)</label>
                <textarea 
                  className="form-input" 
                  value={transferData.notes} 
                  onChange={e => setTransferData({...transferData, notes: e.target.value})} 
                  placeholder="Reason for transfer, delivery details, etc."
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModalType(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--primary)' }} disabled={saving}>
                  {saving ? 'Processing...' : 'Transfer Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
