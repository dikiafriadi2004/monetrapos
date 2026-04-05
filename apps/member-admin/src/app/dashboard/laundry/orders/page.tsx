'use client';

import { useState, useEffect } from 'react';
import { laundryService, LaundryOrder, LaundryOrderStatus } from '@/services/laundry.service';
import { Shirt, Eye, Plus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, DeleteModal, PageHeader, SearchInput, StatusBadge, EmptyState, LoadingSpinner } from '@/components/ui';

const ITEM_TYPES = ['shirt','pants','dress','jacket','skirt','bedsheet','blanket','curtain','towel','other'];

const STATUS_BADGE: Record<string, string> = {
  received: 'badge-gray', washing: 'badge-primary', drying: 'badge-warning',
  ironing: 'bg-purple-100 text-purple-700', ready: 'badge-success', delivered: 'badge-info', cancelled: 'badge-danger',
};

export default function LaundryOrdersPage() {
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LaundryOrderStatus | ''>('');
  const [selectedOrder, setSelectedOrder] = useState<LaundryOrder | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadOrders(); }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await laundryService.getOrders({ status: statusFilter || undefined });
      setOrders(Array.isArray(res) ? res : []);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: LaundryOrderStatus) => {
    try {
      await laundryService.updateOrderStatus(orderId, newStatus);
      toast.success('Status updated');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch { toast.error('Failed to update status'); }
  };

  const filtered = orders.filter(o =>
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <div>
      <PageHeader title="Laundry Orders" description="Manage laundry service orders"
        action={<button onClick={() => setShowCreate(true)} className="btn btn-primary"><Plus size={16}/> New Order</button>} />

      <div className="flex flex-wrap gap-3 mb-6">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search orders..." className="flex-1 min-w-[200px]" />
        <select className="form-input w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="">All Status</option>
          {Object.values(LaundryOrderStatus).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={Shirt} title="No orders found" action={<button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm"><Plus size={14}/> New Order</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(order => (
            <div key={order.id} className="card hover:shadow-md transition-shadow animate-fade-in">
              <div className="card-body">
                <div className="flex justify-between items-start mb-3">
                  <div><p className="font-bold text-gray-900">{order.orderNumber}</p><p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p></div>
                  <Shirt size={18} className="text-indigo-400"/>
                </div>
                {order.customerName && <p className="text-sm text-gray-600 mb-1">👤 {order.customerName}</p>}
                {order.serviceTypeName && <p className="text-sm text-gray-600 mb-1">🧺 {order.serviceTypeName}</p>}
                {order.totalWeight && <p className="text-sm text-gray-600 mb-1">⚖️ {order.totalWeight} kg</p>}
                {order.deliveryDate && <p className="text-sm text-gray-600 mb-3">📅 {new Date(order.deliveryDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>}
                <p className="text-lg font-bold text-emerald-600 mb-3">{fmt(order.totalPrice)}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'} capitalize`}>{order.status.replace('_',' ')}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedOrder(order)} className="btn btn-outline btn-sm"><Eye size={13}/> View</button>
                    {order.status !== LaundryOrderStatus.DELIVERED && order.status !== LaundryOrderStatus.CANCELLED && (
                      <select className="form-input h-8 text-xs py-0 w-32" value={order.status} onChange={e => handleUpdateStatus(order.id, e.target.value as LaundryOrderStatus)}>
                        {Object.values(LaundryOrderStatus).filter(s => s !== LaundryOrderStatus.CANCELLED).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order — ${selectedOrder?.orderNumber}`} size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['Status', selectedOrder.status.replace('_',' ')], ['Service', selectedOrder.serviceTypeName||'—'], ...(selectedOrder.customerName ? [['Customer', selectedOrder.customerName]] : []), ...(selectedOrder.totalWeight ? [['Weight', `${selectedOrder.totalWeight} kg`]] : []), ...(selectedOrder.pickupDate ? [['Pickup', new Date(selectedOrder.pickupDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })]] : []), ...(selectedOrder.deliveryDate ? [['Delivery', new Date(selectedOrder.deliveryDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })]] : [])].map(([l,v]) => (
                <div key={l}><p className="text-xs text-gray-400 uppercase">{l}</p><p className="font-semibold mt-0.5 capitalize">{v}</p></div>
              ))}
            </div>
            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Items ({selectedOrder.items.length})</p>
                {selectedOrder.items.map(item => (
                  <div key={item.id} className="flex justify-between py-1.5 border-b border-gray-100 text-sm">
                    <div><span className="font-medium">{item.itemName}</span><span className="text-gray-400 ml-2">×{item.quantity}</span>{item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between font-bold text-base bg-gray-50 rounded-lg p-3"><span>Total</span><span className="text-emerald-600">{fmt(selectedOrder.totalPrice)}</span></div>
            {selectedOrder.notes && <p className="text-sm text-gray-500">📝 {selectedOrder.notes}</p>}
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); loadOrders(); }} />}
    </div>
  );
}

function CreateOrderModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({ store_id: '', customer_id: '', service_type_id: '', weight_kg: '', notes: '', pickup_date: new Date().toISOString().split('T')[0], delivery_date: new Date(Date.now() + 2*86400000).toISOString().split('T')[0], pickup_address: '', delivery_address: '' });
  const [items, setItems] = useState([{ item_type: 'shirt', quantity: 1, description: '', color: '', brand: '', notes: '' }]);

  useEffect(() => {
    laundryService.getServiceTypes().then(setServiceTypes).catch(() => {});
    import('@/lib/api-client').then(({ default: apiClient }) => {
      apiClient.get('/stores').then((r: any) => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setStores(list);
        if (list.length > 0) setForm(p => ({ ...p, store_id: list[0].id }));
      }).catch(() => {});
      apiClient.get('/customers').then((r: any) => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setCustomers(list);
      }).catch(() => {});
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.store_id || !form.service_type_id) { toast.error('Store and service type are required'); return; }
    setSaving(true);
    try {
      await laundryService.createOrder({ ...form, weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined, items: items.map(i => ({ ...i, quantity: Number(i.quantity) })) });
      toast.success('Order created'); onSuccess();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to create order'); }
    finally { setSaving(false); }
  };

  const f = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  return (
    <Modal open title="New Laundry Order" onClose={onClose} size="xl"
      footer={<><button onClick={onClose} className="btn btn-outline">Cancel</button><button form="laundry-form" type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : null}Create Order</button></>}>
      <form id="laundry-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group"><label className="form-label">Store *</label><select className="form-input" value={form.store_id} onChange={e => f('store_id',e.target.value)} required><option value="">Select store...</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Customer</label><select className="form-input" value={form.customer_id} onChange={e => f('customer_id',e.target.value)}><option value="">Walk-in customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}</select></div>
          <div className="form-group col-span-2"><label className="form-label">Service Type *</label><select className="form-input" value={form.service_type_id} onChange={e => f('service_type_id',e.target.value)} required><option value="">Select service type...</option>{serviceTypes.map(s => <option key={s.id} value={s.id}>{s.name} — {s.pricingType==='per_kg'?`Rp ${s.price.toLocaleString('id-ID')}/kg`:`Rp ${s.price.toLocaleString('id-ID')}/item`}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Weight (kg)</label><input type="number" className="form-input" value={form.weight_kg} onChange={e => f('weight_kg',e.target.value)} step="0.1" min="0"/></div>
          <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e => f('notes',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Pickup Date *</label><input type="date" className="form-input" value={form.pickup_date} onChange={e => f('pickup_date',e.target.value)} required/></div>
          <div className="form-group"><label className="form-label">Delivery Date *</label><input type="date" className="form-input" value={form.delivery_date} onChange={e => f('delivery_date',e.target.value)} required/></div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2"><label className="form-label mb-0">Items</label><button type="button" onClick={() => setItems(p=>[...p,{item_type:'shirt',quantity:1,description:'',color:'',brand:'',notes:''}])} className="btn btn-outline btn-sm">+ Add Item</button></div>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-center">
              <select className="form-input" value={item.item_type} onChange={e => { const n=[...items]; n[i]={...n[i],item_type:e.target.value}; setItems(n); }}>{ITEM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
              <input type="number" className="form-input" value={item.quantity} onChange={e => { const n=[...items]; n[i]={...n[i],quantity:Number(e.target.value)}; setItems(n); }} min="1" placeholder="Qty"/>
              <input className="form-input" value={item.color} onChange={e => { const n=[...items]; n[i]={...n[i],color:e.target.value}; setItems(n); }} placeholder="Color"/>
              <input className="form-input" value={item.brand} onChange={e => { const n=[...items]; n[i]={...n[i],brand:e.target.value}; setItems(n); }} placeholder="Brand"/>
              <button type="button" onClick={() => setItems(p=>p.filter((_,j)=>j!==i))} className="btn btn-ghost btn-icon text-red-500" disabled={items.length===1}><X size={16}/></button>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
}
