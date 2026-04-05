'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { purchaseOrdersService, CreatePurchaseOrderDto } from '@/services/purchase-orders.service';
import { suppliersService, Supplier } from '@/services/suppliers.service';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Store { id: string; name: string; }
interface Product { id: string; name: string; sku?: string; basePrice?: number; costPrice?: number; }

const emptyItem = { productId: '', quantity: 1, unitPrice: 0 };

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    supplierId: '', storeId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '', notes: '',
  });
  const [items, setItems] = useState([{ ...emptyItem }]);

  useEffect(() => {
    Promise.all([
      suppliersService.getAll({ active: true }).then(r => setSuppliers(r.data)).catch(() => {}),
      apiClient.get('/stores').then(r => setStores(Array.isArray(r.data) ? r.data : (r.data?.data || []))).catch(() => {}),
      apiClient.get('/products').then(r => setProducts(Array.isArray(r.data) ? r.data : (r.data?.data || []))).catch(() => {}),
    ]);
  }, []);

  const addItem = () => setItems(p => [...p, { ...emptyItem }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: string, val: any) =>
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [key]: val } : item));

  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplierId || !form.storeId) { toast.error('Supplier and store are required'); return; }
    if (items.some(i => !i.productId || i.quantity < 1)) { toast.error('All items need a product and quantity'); return; }
    setSaving(true);
    try {
      const payload: CreatePurchaseOrderDto = {
        supplierId: form.supplierId,
        storeId: form.storeId,
        orderDate: form.orderDate,
        expectedDate: form.expectedDate || undefined,
        notes: form.notes || undefined,
        items: items.map(i => ({ productId: i.productId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
      };
      const po = await purchaseOrdersService.create(payload);
      toast.success('Purchase order created');
      router.push(`/dashboard/inventory/purchase-orders/${po.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create purchase order');
    } finally { setSaving(false); }
  };

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <button onClick={() => router.back()} className="btn btn-outline" style={{ padding: 'var(--space-sm)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>New Purchase Order</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Create a new purchase order for your supplier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-lg)', alignItems: 'start' }}>
          {/* Left — main form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Header info */}
            <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
              <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Order Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Supplier *</label>
                  <select className="form-input" value={form.supplierId} onChange={e => f('supplierId', e.target.value)} required>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Store *</label>
                  <select className="form-input" value={form.storeId} onChange={e => f('storeId', e.target.value)} required>
                    <option value="">Select store...</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Order Date *</label>
                  <input type="date" className="form-input" value={form.orderDate} onChange={e => f('orderDate', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Expected Delivery</label>
                  <input type="date" className="form-input" value={form.expectedDate} onChange={e => f('expectedDate', e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-input" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} style={{ resize: 'vertical' }} placeholder="Special instructions, delivery notes..." />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ fontWeight: 600 }}>Order Items</h3>
                <button type="button" onClick={addItem} className="btn btn-outline" style={{ height: 32, padding: '0 12px', fontSize: '0.85rem' }}>
                  <Plus size={14} /> Add Item
                </button>
              </div>

              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr 1.5fr 40px', gap: 'var(--space-sm)', padding: '0 0 var(--space-sm)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                <div>Product</div><div>Qty</div><div>Unit Price</div><div>Total</div><div />
              </div>

              {items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr 1.5fr 40px', gap: 'var(--space-sm)', alignItems: 'center', padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <select className="form-input" style={{ height: 36 }} value={item.productId}
                    onChange={e => {
                      const prod = products.find(p => p.id === e.target.value);
                      updateItem(i, 'productId', e.target.value);
                      if (prod?.costPrice) updateItem(i, 'unitPrice', prod.costPrice);
                    }} required>
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>)}
                  </select>
                  <input type="number" className="form-input" style={{ height: 36 }} value={item.quantity} min="1"
                    onChange={e => updateItem(i, 'quantity', Number(e.target.value))} required />
                  <input type="number" className="form-input" style={{ height: 36 }} value={item.unitPrice} min="0"
                    onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} required />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--success)' }}>
                    {fmt(item.quantity * item.unitPrice)}
                  </div>
                  <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4, opacity: items.length === 1 ? 0.3 : 1 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  Total: <span style={{ color: 'var(--success)' }}>{fmt(subtotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — summary & submit */}
          <div className="glass-panel" style={{ padding: 'var(--space-xl)', position: 'sticky', top: 'var(--space-lg)' }}>
            <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Order Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Items</span>
                <span>{items.filter(i => i.productId).length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-subtle)' }}>
                <span>Total</span>
                <span style={{ color: 'var(--success)' }}>{fmt(subtotal)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {saving ? 'Creating...' : 'Create Purchase Order'}
              </button>
              <button type="button" onClick={() => router.back()} className="btn btn-outline" style={{ width: '100%' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}
