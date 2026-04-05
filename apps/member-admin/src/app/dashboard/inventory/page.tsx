"use client";

import { useState, useEffect } from 'react';
import { Warehouse, Plus, ArrowDownToLine, ArrowUpFromLine, RotateCcw, Package, AlertTriangle, ArrowRightLeft, TrendingDown, Loader2 } from 'lucide-react';
import { inventoryService, InventoryItem, StockMovement } from '@/services/inventory.service';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Modal, PageHeader, StatusBadge, EmptyState, LoadingSpinner } from '@/components/ui';

interface Product { id: string; name: string; sku: string; minStock: number; }
interface SimpleStore { id: string; name: string; }
type ModalType = 'movement' | 'transfer' | 'reserve' | 'release' | null;

const MOVEMENT_LABELS: Record<string, { label: string; badge: string }> = {
  IN: { label: 'Stock In', badge: 'badge-success' }, OUT: { label: 'Stock Out', badge: 'badge-danger' },
  SALE: { label: 'Sale', badge: 'badge-warning' }, ADJUSTMENT: { label: 'Adjustment', badge: 'badge-info' },
  RETURN: { label: 'Return', badge: 'bg-purple-100 text-purple-700' }, TRANSFER: { label: 'Transfer', badge: 'badge-primary' },
};

export default function InventoryPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<SimpleStore[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements' | 'lowStock'>('inventory');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [formData, setFormData] = useState({ type: 'IN', quantity: '', productId: '', storeId: '', reason: '', reference: '' });
  const [transferData, setTransferData] = useState({ fromStoreId: '', toStoreId: '', items: [{ productId: '', quantity: '' }], notes: '' });
  const [reserveData, setReserveData] = useState({ productId: '', quantity: '', reference: '' });
  const [saving, setSaving] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState('');

  useEffect(() => { fetchData(); }, [activeStoreId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storesRes = await apiClient.get('/stores').then((r: any) => (r.data ?? r) as SimpleStore[]).catch(() => [] as SimpleStore[]);
      setStores(Array.isArray(storesRes) ? storesRes : []);
      const storeId = activeStoreId || storesRes[0]?.id || '';
      if (!activeStoreId && storeId) setActiveStoreId(storeId);
      const [movRes, prodRes, invRes, lowStockRes] = await Promise.all([
        inventoryService.getMovements(storeId).catch(() => []),
        apiClient.get('/products').then((r: any) => (r.data ?? r) as Product[]).catch(() => [] as Product[]),
        inventoryService.getInventory(storeId).catch(() => []),
        inventoryService.getLowStock(storeId).catch(() => []),
      ]);
      setMovements(Array.isArray(movRes) ? movRes : []);
      setProducts(Array.isArray(prodRes) ? prodRes : []);
      setInventory(Array.isArray(invRes) ? invRes : []);
      setLowStockItems(Array.isArray(lowStockRes) ? lowStockRes : []);
    } catch (err) { console.error('Failed to fetch inventory:', err); toast.error('Failed to load inventory data'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await inventoryService.createMovement({ ...formData, quantity: parseInt(formData.quantity as string) || 1, storeId: activeStoreId });
      toast.success('Stock adjustment saved'); setModalType(null); setFormData({ type: 'IN', quantity: '', productId: '', storeId: '', reason: '', reference: '' }); await fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to save adjustment'); }
    finally { setSaving(false); }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await inventoryService.transfer({ fromStoreId: transferData.fromStoreId, toStoreId: transferData.toStoreId, items: transferData.items.map(i => ({ productId: i.productId, quantity: parseInt(i.quantity as string) || 1 })), notes: transferData.notes });
      toast.success('Stock transferred'); setModalType(null); setTransferData({ fromStoreId: '', toStoreId: '', items: [{ productId: '', quantity: '' }], notes: '' }); await fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to transfer stock'); }
    finally { setSaving(false); }
  };

  const handleReserveRelease = async (e: React.FormEvent, type: 'reserve' | 'release') => {
    e.preventDefault();
    if (!reserveData.productId || !reserveData.quantity) { toast.error('Product and quantity required'); return; }
    setSaving(true);
    try {
      const dto = { storeId: activeStoreId, productId: reserveData.productId, quantity: parseInt(reserveData.quantity) || 1, reference: reserveData.reference || undefined };
      if (type === 'reserve') await inventoryService.reserve(dto); else await inventoryService.release(dto);
      toast.success(`Stock ${type}d`); setModalType(null); setReserveData({ productId: '', quantity: '', reference: '' }); await fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.message || `Failed to ${type} stock`); }
    finally { setSaving(false); }
  };

  const TABS = [
    { id: 'inventory', label: 'Current Stock', icon: Package },
    { id: 'movements', label: 'Movement History', icon: RotateCcw },
    { id: 'lowStock', label: `Low Stock${lowStockItems.length > 0 ? ` (${lowStockItems.length})` : ''}`, icon: TrendingDown },
  ];

  return (
    <div>
      <PageHeader title="Inventory Management" description="Track stock levels, movements, and manage inventory across stores."
        action={
          <div className="flex gap-2">
            <button onClick={() => { setReserveData({ productId: '', quantity: '', reference: '' }); setModalType('release'); }} className="btn btn-outline btn-sm"><ArrowUpFromLine size={14}/> Release</button>
            <button onClick={() => { setReserveData({ productId: '', quantity: '', reference: '' }); setModalType('reserve'); }} className="btn btn-outline btn-sm"><ArrowDownToLine size={14}/> Reserve</button>
            <button onClick={() => setModalType('transfer')} className="btn btn-outline btn-sm"><ArrowRightLeft size={14}/> Transfer</button>
            <button onClick={() => setModalType('movement')} className="btn btn-success btn-sm"><Plus size={14}/> Adjustment</button>
          </div>
        } />

      {stores.length > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium text-gray-700">Store:</label>
          <select className="form-input w-48" value={activeStoreId} onChange={e => setActiveStoreId(e.target.value)}>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3"><AlertTriangle size={20} className="text-red-500"/><div><p className="font-semibold text-red-800">Low Stock Alert</p><p className="text-sm text-red-600">{lowStockItems.length} product{lowStockItems.length > 1 ? 's' : ''} running low</p></div></div>
          <div className="flex gap-2">
            <button onClick={async () => { setSendingAlert(true); try { await inventoryService.sendLowStockAlerts(activeStoreId); toast.success('Alerts sent!'); } catch { toast.error('Failed to send alerts'); } finally { setSendingAlert(false); } }} disabled={sendingAlert} className="btn btn-warning btn-sm">{sendingAlert ? <Loader2 size={13} className="animate-spin"/> : null}Send Alert</button>
            <button onClick={() => setActiveTab('lowStock')} className="btn btn-outline btn-sm text-red-600 border-red-300">View Details</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon size={14}/>{tab.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {activeTab === 'inventory' && (
            <div className="card">
              <div className="table-container border-0">
                <table className="table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Available</th><th>Reserved</th><th>Min Stock</th></tr></thead>
                  <tbody>
                    {inventory.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-400">No inventory data</td></tr> :
                      inventory.map(item => {
                        const isLow = item.availableQuantity <= (item.product?.minStock || 0);
                        return (
                          <tr key={item.id}>
                            <td><div className="font-medium">{item.product?.name || 'Unknown'}</div>{isLow && <span className="badge badge-danger text-xs mt-0.5">Low Stock</span>}</td>
                            <td className="text-gray-400 font-mono text-xs">{item.product?.sku || '—'}</td>
                            <td><span className={`font-bold ${isLow ? 'text-red-600' : 'text-emerald-600'}`}>{item.availableQuantity}</span></td>
                            <td className="text-gray-500">{item.reservedQuantity || 0}</td>
                            <td className="text-gray-400">{item.product?.minStock || 0}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'movements' && (
            <div className="card">
              <div className="table-container border-0">
                <table className="table">
                  <thead><tr><th>Type</th><th>Product</th><th>Qty</th><th>Stock After</th><th>Reason</th><th>Date</th></tr></thead>
                  <tbody>
                    {movements.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-400">No movements recorded</td></tr> :
                      movements.map(m => {
                        const info = MOVEMENT_LABELS[m.type] || { label: m.type, badge: 'badge-gray' };
                        return (
                          <tr key={m.id}>
                            <td><span className={`badge ${info.badge}`}>{info.label}</span></td>
                            <td className="font-medium">{m.product?.name || m.productId}</td>
                            <td><span className={`font-bold ${['IN','RETURN'].includes(m.type) ? 'text-emerald-600' : 'text-red-600'}`}>{['IN','RETURN'].includes(m.type) ? '+' : '-'}{m.quantity}</span></td>
                            <td>{m.stockAfter}</td>
                            <td className="text-gray-500 text-sm">{m.reason || '—'}</td>
                            <td className="text-gray-400 text-sm whitespace-nowrap">{new Date(m.createdAt).toLocaleString('id-ID')}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'lowStock' && (
            <div className="card">
              <div className="table-container border-0">
                <table className="table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Current Stock</th><th>Min Stock</th><th>Status</th></tr></thead>
                  <tbody>
                    {lowStockItems.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-emerald-600">✓ All products are well stocked!</td></tr> :
                      lowStockItems.map(item => {
                        const isCritical = (item.availableQuantity / (item.product?.minStock || 1)) * 100 < 50;
                        return (
                          <tr key={item.id}>
                            <td className="font-medium">{item.product?.name || 'Unknown'}</td>
                            <td className="text-gray-400 font-mono text-xs">{item.product?.sku || '—'}</td>
                            <td><span className={`font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>{item.availableQuantity}</span></td>
                            <td className="text-gray-400">{item.product?.minStock || 0}</td>
                            <td><span className={`badge ${isCritical ? 'badge-danger' : 'badge-warning'}`}>{isCritical ? 'Critical' : 'Low Stock'}</span></td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Stock Adjustment Modal */}
      <Modal open={modalType === 'movement'} onClose={() => setModalType(null)} title="Stock Adjustment"
        footer={<><button onClick={() => setModalType(null)} className="btn btn-outline" disabled={saving}>Cancel</button><button form="movement-form" type="submit" className="btn btn-success" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : null}Submit</button></>}>
        <form id="movement-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={formData.type} onChange={e => setFormData({...formData,type:e.target.value})}><option value="IN">Stock In</option><option value="OUT">Stock Out</option><option value="ADJUSTMENT">Manual Adjustment</option><option value="RETURN">Customer Return</option></select></div>
          <div className="form-group"><label className="form-label">Product *</label><select className="form-input" value={formData.productId} onChange={e => setFormData({...formData,productId:e.target.value})} required><option value="">Select product...</option>{products.map(p => { const inv = inventory.find(i => i.productId === p.id); return <option key={p.id} value={p.id}>{p.name} (Stock: {inv?.availableQuantity || 0})</option>; })}</select></div>
          <div className="form-group"><label className="form-label">Quantity *</label><input type="number" className="form-input" value={formData.quantity} onChange={e => setFormData({...formData,quantity:e.target.value})} required min="1" placeholder="Enter quantity"/></div>
          <div className="form-group"><label className="form-label">Reason *</label><textarea className="form-input" value={formData.reason} onChange={e => setFormData({...formData,reason:e.target.value})} rows={2} required placeholder="e.g. Weekly restock, Damaged items"/></div>
          <div className="form-group"><label className="form-label">Reference (Optional)</label><input className="form-input" value={formData.reference} onChange={e => setFormData({...formData,reference:e.target.value})} placeholder="Invoice #, PO #"/></div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal open={modalType === 'transfer'} onClose={() => setModalType(null)} title="Transfer Stock" size="lg"
        footer={<><button onClick={() => setModalType(null)} className="btn btn-outline" disabled={saving}>Cancel</button><button form="transfer-form" type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : null}Transfer</button></>}>
        <form id="transfer-form" onSubmit={handleTransfer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group"><label className="form-label">From Store *</label><select className="form-input" value={transferData.fromStoreId} onChange={e => setTransferData({...transferData,fromStoreId:e.target.value})} required><option value="">Select source...</option>{stores.map(s => <option key={s.id} value={s.id} disabled={s.id===transferData.toStoreId}>{s.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">To Store *</label><select className="form-input" value={transferData.toStoreId} onChange={e => setTransferData({...transferData,toStoreId:e.target.value})} required><option value="">Select destination...</option>{stores.map(s => <option key={s.id} value={s.id} disabled={s.id===transferData.fromStoreId}>{s.name}</option>)}</select></div>
          </div>
          <div>
            <label className="form-label mb-2">Items</label>
            {transferData.items.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select className="form-input flex-1" value={item.productId} onChange={e => { const items=[...transferData.items]; items[i]={...items[i],productId:e.target.value}; setTransferData({...transferData,items}); }} required><option value="">Select product...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                <input type="number" className="form-input w-24" value={item.quantity} onChange={e => { const items=[...transferData.items]; items[i]={...items[i],quantity:e.target.value}; setTransferData({...transferData,items}); }} placeholder="Qty" required min="1"/>
                {transferData.items.length > 1 && <button type="button" onClick={() => setTransferData({...transferData,items:transferData.items.filter((_,j)=>j!==i)})} className="btn btn-ghost btn-icon text-red-500">×</button>}
              </div>
            ))}
            <button type="button" onClick={() => setTransferData({...transferData,items:[...transferData.items,{productId:'',quantity:''}]})} className="btn btn-outline btn-sm w-full">+ Add Item</button>
          </div>
          <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" value={transferData.notes} onChange={e => setTransferData({...transferData,notes:e.target.value})} rows={2}/></div>
        </form>
      </Modal>

      {/* Reserve/Release Modal */}
      <Modal open={modalType === 'reserve' || modalType === 'release'} onClose={() => setModalType(null)} title={modalType === 'reserve' ? 'Reserve Stock' : 'Release Stock'}
        footer={<><button onClick={() => setModalType(null)} className="btn btn-outline" disabled={saving}>Cancel</button><button form="reserve-form" type="submit" className={`btn ${modalType === 'reserve' ? 'btn-warning' : 'btn-primary'}`} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : null}{modalType === 'reserve' ? 'Reserve' : 'Release'}</button></>}>
        <form id="reserve-form" onSubmit={e => handleReserveRelease(e, modalType as 'reserve' | 'release')} className="space-y-4">
          <div className="form-group"><label className="form-label">Product *</label><select className="form-input" value={reserveData.productId} onChange={e => setReserveData({...reserveData,productId:e.target.value})} required><option value="">Select product...</option>{products.map(p => { const inv = inventory.find(i => i.productId === p.id); return <option key={p.id} value={p.id}>{p.name} (Available: {inv?.availableQuantity ?? 0}, Reserved: {inv?.reservedQuantity ?? 0})</option>; })}</select></div>
          <div className="form-group"><label className="form-label">Quantity *</label><input type="number" className="form-input" value={reserveData.quantity} onChange={e => setReserveData({...reserveData,quantity:e.target.value})} required min="1"/></div>
          <div className="form-group"><label className="form-label">Reference</label><input className="form-input" value={reserveData.reference} onChange={e => setReserveData({...reserveData,reference:e.target.value})} placeholder="Order #, reference..."/></div>
        </form>
      </Modal>
    </div>
  );
}
