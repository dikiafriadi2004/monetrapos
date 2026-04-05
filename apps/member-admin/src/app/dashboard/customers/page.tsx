'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Eye, Gift, History, Loader2 } from 'lucide-react';
import { customersService, Customer } from '@/services/customers.service';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/hooks/usePermission';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Modal, DeleteModal, PageHeader, SearchInput, StatusBadge, EmptyState, LoadingSpinner, Pagination, StatsCard } from '@/components/ui';

interface Store { id: string; name: string; }
type ModalType = 'create' | 'edit' | 'view' | 'loyalty' | 'purchaseHistory' | 'loyaltyHistory' | 'delete' | null;

const TIER_BADGE: Record<string, string> = {
  regular: 'badge-gray', silver: 'bg-gray-200 text-gray-700',
  gold: 'bg-amber-100 text-amber-700', platinum: 'bg-blue-100 text-blue-700',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', city: '', postalCode: '', storeId: '' });
  const [loyaltyForm, setLoyaltyForm] = useState({ action: 'add' as 'add' | 'redeem', points: '', amount: '', description: '' });
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [loyaltyHistory, setLoyaltyHistory] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, [currentPage, searchTerm]);

  // Update storeId in form when stores load
  useEffect(() => {
    if (stores.length > 0 && modalType === 'create' && !formData.storeId) {
      setFormData(prev => ({ ...prev, storeId: stores[0].id }));
    }
  }, [stores, modalType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customersRes, storesRes]: any = await Promise.all([
        customersService.getAll({ page: currentPage, limit: 10, search: searchTerm }),
        apiClient.get('/stores').then((r: any) => r.data ?? r).catch(() => []),
      ]);
      setCustomers((customersRes as any).data || customersRes || []);
      setTotalPages((customersRes as any).meta?.totalPages || 1);
      setStores(Array.isArray(storesRes) ? storesRes : (storesRes?.data || []));
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      toast.error('Failed to load customers');
    } finally { setLoading(false); }
  };

  const openModal = (type: ModalType, customer?: Customer) => {
    setModalType(type); setSelectedCustomer(customer || null);
    const defaultStoreId = stores[0]?.id || '';
    if (type === 'edit' && customer) setFormData({ name: customer.name, email: customer.email || '', phone: customer.phone || '', address: customer.address || '', city: customer.city || '', postalCode: customer.postalCode || '', storeId: defaultStoreId });
    else if (type === 'create') setFormData({ name: '', email: '', phone: '', address: '', city: '', postalCode: '', storeId: defaultStoreId });
    else if (type === 'loyalty' && customer) setLoyaltyForm({ action: 'add', points: '', amount: '', description: '' });
    else if (type === 'purchaseHistory' && customer) customersService.getPurchaseHistory(customer.id).then(r => setPurchaseHistory(Array.isArray(r) ? r : [])).catch(() => toast.error('Failed to load history'));
    else if (type === 'loyaltyHistory' && customer) customersService.getLoyaltyHistory(customer.id).then(r => setLoyaltyHistory(Array.isArray(r) ? r : [])).catch(() => toast.error('Failed to load history'));
  };

  const closeModal = () => { setModalType(null); setSelectedCustomer(null); setPurchaseHistory([]); setLoyaltyHistory([]); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modalType === 'create') { await customersService.create(formData); toast.success('Customer created'); }
      else if (modalType === 'edit' && selectedCustomer) { await customersService.update(selectedCustomer.id, formData); toast.success('Customer updated'); }
      closeModal(); await fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to save customer'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return; setDeleting(true);
    try {
      await customersService.delete(selectedCustomer.id); toast.success('Customer deleted');
      closeModal(); await fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to delete customer'); }
    finally { setDeleting(false); }
  };

  const handleLoyalty = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedCustomer) return; setSaving(true);
    try {
      const dto = { customerId: selectedCustomer.id, points: parseInt(loyaltyForm.points), amount: loyaltyForm.amount ? parseFloat(loyaltyForm.amount) : undefined, description: loyaltyForm.description || undefined };
      if (loyaltyForm.action === 'add') { await customersService.addLoyaltyPoints(dto); toast.success('Points added'); }
      else { await customersService.redeemLoyaltyPoints(dto); toast.success('Points redeemed'); }
      closeModal(); await fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to process loyalty points'); }
    finally { setSaving(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.customerNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Customer Management" description="Manage customer profiles, loyalty points, and purchase history."
        action={<button className="btn btn-primary" onClick={() => openModal('create')}><Plus size={16}/> Add Customer</button>} />

      <div className="flex gap-3 mb-6">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by name, email, phone, or customer number..." className="flex-1 max-w-md" />
      </div>

      {loading ? <LoadingSpinner /> : filteredCustomers.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" action={<button onClick={() => openModal('create')} className="btn btn-primary btn-sm"><Plus size={14}/> Add Customer</button>} />
      ) : (
        <div className="card">
          <div className="table-container border-0">
            <table className="table">
              <thead><tr><th>Customer</th><th>Contact</th><th>Loyalty Points</th><th>Tier</th><th>Total Spent</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filteredCustomers.map(customer => (
                  <tr key={customer.id}>
                    <td><div className="font-semibold">{customer.name}</div><div className="text-xs text-gray-400">{customer.customerNumber}</div></td>
                    <td><div className="text-sm">{customer.phone || '—'}</div><div className="text-xs text-gray-400">{customer.email || '—'}</div></td>
                    <td><span className="font-bold text-indigo-600">{customer.loyaltyPoints.toLocaleString()} pts</span></td>
                    <td><span className={`badge ${TIER_BADGE[customer.loyaltyTier] || 'badge-gray'} capitalize`}>{customer.loyaltyTier}</span></td>
                    <td className="font-medium">{fmt(Number(customer.totalSpent))}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal('view', customer)} className="btn btn-ghost btn-icon btn-sm" title="View" disabled={saving}><Eye size={14}/></button>
                        <button onClick={() => openModal('loyalty', customer)} className="btn btn-ghost btn-icon btn-sm text-indigo-500" title="Loyalty" disabled={saving}><Gift size={14}/></button>
                        <button onClick={() => openModal('edit', customer)} className="btn btn-ghost btn-icon btn-sm" title="Edit" disabled={saving}><Edit size={14}/></button>
                        <button onClick={() => openModal('delete', customer)} className="btn btn-ghost btn-icon btn-sm text-red-500" title="Delete" disabled={saving}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalType === 'create' || modalType === 'edit'} onClose={closeModal} title={modalType === 'create' ? 'Add New Customer' : 'Edit Customer'} size="lg"
        footer={<><button onClick={closeModal} className="btn btn-outline" disabled={saving}>Cancel</button><button form="customer-form" type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : null}{modalType === 'create' ? 'Create Customer' : 'Save Changes'}</button></>}>
        <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} required placeholder="Enter customer name"/></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData,email:e.target.value})} placeholder="customer@example.com"/></div>
            <div className="form-group"><label className="form-label">Phone</label><input type="tel" className="form-input" value={formData.phone} onChange={e => setFormData({...formData,phone:e.target.value})} placeholder="081234567890"/></div>
          </div>
          <div className="form-group"><label className="form-label">Address</label><textarea className="form-input" value={formData.address} onChange={e => setFormData({...formData,address:e.target.value})} rows={2} placeholder="Street address"/></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group"><label className="form-label">City</label><input className="form-input" value={formData.city} onChange={e => setFormData({...formData,city:e.target.value})} placeholder="City"/></div>
            <div className="form-group"><label className="form-label">Postal Code</label><input className="form-input" value={formData.postalCode} onChange={e => setFormData({...formData,postalCode:e.target.value})} placeholder="12345"/></div>
          </div>
          {modalType === 'create' && stores.length > 0 && (
            <div className="form-group"><label className="form-label">Store *</label><select className="form-input" value={formData.storeId} onChange={e => setFormData({...formData,storeId:e.target.value})} required>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          )}
        </form>
      </Modal>

      {/* View Modal */}
      <Modal open={modalType === 'view'} onClose={closeModal} title="Customer Details" size="lg">
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['Customer #', selectedCustomer.customerNumber], ['Name', selectedCustomer.name], ['Email', selectedCustomer.email||'—'], ['Phone', selectedCustomer.phone||'—']].map(([l,v]) => (
                <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-semibold mt-0.5">{v}</p></div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[['Points', selectedCustomer.loyaltyPoints.toLocaleString(), 'text-indigo-600'], ['Tier', selectedCustomer.loyaltyTier, 'capitalize'], ['Orders', selectedCustomer.totalOrders, 'text-emerald-600'], ['Spent', fmt(Number(selectedCustomer.totalSpent)), 'text-amber-600']].map(([l,v,c]) => (
                <div key={l as string} className="bg-gray-50 rounded-lg p-3 text-center"><div className={`text-lg font-bold ${c}`}>{v}</div><div className="text-xs text-gray-400 mt-0.5">{l}</div></div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openModal('purchaseHistory', selectedCustomer)} className="btn btn-outline flex-1"><History size={14}/> Purchase History</button>
              <button onClick={() => openModal('loyaltyHistory', selectedCustomer)} className="btn btn-outline flex-1 text-indigo-600"><Gift size={14}/> Loyalty History</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Loyalty Modal */}
      <Modal open={modalType === 'loyalty'} onClose={closeModal} title="Manage Loyalty Points"
        footer={<><button onClick={closeModal} className="btn btn-outline" disabled={saving}>Cancel</button><button form="loyalty-form" type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : null}Process</button></>}>
        {selectedCustomer && (
          <form id="loyalty-form" onSubmit={handleLoyalty} className="space-y-4">
            <div className="bg-indigo-50 rounded-lg p-4 text-center">
              <p className="text-sm text-indigo-600">{selectedCustomer.name}</p>
              <p className="text-3xl font-bold text-indigo-700 mt-1">{selectedCustomer.loyaltyPoints.toLocaleString()} pts</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['add', 'redeem'] as const).map(a => (
                <button key={a} type="button" onClick={() => setLoyaltyForm(p=>({...p,action:a}))} className={`btn ${loyaltyForm.action === a ? 'btn-primary' : 'btn-outline'} capitalize`}>{a} Points</button>
              ))}
            </div>
            <div className="form-group"><label className="form-label">Points *</label><input type="number" className="form-input" value={loyaltyForm.points} onChange={e => setLoyaltyForm(p=>({...p,points:e.target.value}))} required min="1"/></div>
            <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={loyaltyForm.description} onChange={e => setLoyaltyForm(p=>({...p,description:e.target.value}))} placeholder="Optional description"/></div>
          </form>
        )}
      </Modal>

      {/* History Modals */}
      <Modal open={modalType === 'purchaseHistory'} onClose={closeModal} title="Purchase History" size="lg">
        {purchaseHistory.length === 0 ? <p className="text-center text-gray-400 py-8">No purchase history</p> : (
          <div className="space-y-2">
            {purchaseHistory.map((item: any, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
                <div><p className="font-medium">{item.transactionNumber}</p><p className="text-xs text-gray-400">{fmtDate(item.createdAt)}</p></div>
                <span className="font-bold text-emerald-600">{fmt(item.total)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={modalType === 'loyaltyHistory'} onClose={closeModal} title="Loyalty History" size="lg">
        {loyaltyHistory.length === 0 ? <p className="text-center text-gray-400 py-8">No loyalty history</p> : (
          <div className="space-y-2">
            {loyaltyHistory.map((item: any, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
                <div><p className="font-medium capitalize">{item.action}</p><p className="text-xs text-gray-400">{item.description || '—'}</p></div>
                <span className={`font-bold ${item.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{item.points > 0 ? '+' : ''}{item.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <DeleteModal open={modalType === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={deleting}
        title="Delete Customer" description={`Delete "${selectedCustomer?.name}"? This cannot be undone.`} />
    </div>
  );
}
