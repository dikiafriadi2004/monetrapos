'use client';

import { useState, useEffect } from 'react';
import { Store, Plus, Search, Edit, Trash2, Eye, UserPlus, UserX, X, MapPin, Clock, Phone, Mail, Building2, Loader2 } from 'lucide-react';
import { storesService, Store as StoreType, StoreStats } from '@/services/stores.service';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Modal, DeleteModal, PageHeader, SearchInput, StatusBadge, EmptyState, LoadingSpinner, Pagination } from '@/components/ui';
import ImageUpload from '@/components/ImageUpload';

interface User { id: string; name: string; email: string; }
type ModalType = 'create' | 'edit' | 'view' | 'delete' | 'assignManager' | 'stats' | null;

const STORE_TYPE_BADGE: Record<string, string> = {
  retail: 'badge-primary', fnb: 'badge-success', warehouse: 'badge-warning', service: 'bg-purple-100 text-purple-700',
};
const STORE_TYPE_LABEL: Record<string, string> = {
  retail: 'Retail', fnb: 'Food & Beverage', warehouse: 'Warehouse', service: 'Service',
};
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export default function StoresPage() {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [storeStats, setStoreStats] = useState<StoreStats | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', type: 'retail' as StoreType['type'], address: '', city: '', province: '', postalCode: '', phone: '', email: '', managerId: '', receiptHeader: '', receiptFooter: '', receiptLogoUrl: '', openingHours: {} as Record<string, { open: string; close: string }> });
  const [managerForm, setManagerForm] = useState({ managerId: '' });

  useEffect(() => { fetchData(); }, [currentPage, searchTerm, filterType, filterActive]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [storesRes, usersRes]: any = await Promise.all([
        storesService.getAll({ page: currentPage, limit: 10, search: searchTerm || undefined, type: filterType || undefined, isActive: filterActive || undefined }),
        apiClient.get('/users').then((r: any) => r.data ?? r).catch(() => []),
      ]);
      setStores((storesRes as any).data || storesRes || []);
      setTotalPages((storesRes as any).meta?.totalPages || 1);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
    } catch (err) { console.error('Failed to fetch stores:', err); toast.error('Failed to load stores'); }
    finally { setLoading(false); }
  };

  const openModal = async (type: ModalType, store?: StoreType) => {
    setModalType(type); setSelectedStore(store || null);
    if (type === 'edit' && store) setFormData({ name: store.name, code: store.code||'', type: store.type, address: store.address||'', city: store.city||'', province: store.province||'', postalCode: store.postalCode||'', phone: store.phone||'', email: store.email||'', managerId: store.managerId||'', receiptHeader: store.receiptHeader||'', receiptFooter: store.receiptFooter||'', receiptLogoUrl: store.receiptLogoUrl||'', openingHours: store.openingHours||{} });
    else if (type === 'create') setFormData({ name: '', code: '', type: 'retail', address: '', city: '', province: '', postalCode: '', phone: '', email: '', managerId: '', receiptHeader: '', receiptFooter: '', receiptLogoUrl: '', openingHours: {} });
    else if (type === 'assignManager' && store) setManagerForm({ managerId: store.managerId || '' });
    else if (type === 'stats' && store) { const stats = await storesService.getStats(store.id).catch(() => null); setStoreStats(stats); }
  };

  const closeModal = () => { setModalType(null); setSelectedStore(null); setStoreStats(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...formData, managerId: formData.managerId || undefined };
      if (modalType === 'create') { await storesService.create(payload); toast.success('Store created'); }
      else if (modalType === 'edit' && selectedStore) { await storesService.update(selectedStore.id, payload); toast.success('Store updated'); }
      closeModal(); await fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to save store'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedStore) return; setDeleting(true);
    try { await storesService.delete(selectedStore.id); toast.success('Store deleted'); closeModal(); await fetchData(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to delete store'); }
    finally { setDeleting(false); }
  };

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedStore) return; setSaving(true);
    try { await storesService.assignManager(selectedStore.id, managerForm.managerId); toast.success('Manager assigned'); closeModal(); await fetchData(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to assign manager'); }
    finally { setSaving(false); }
  };

  const handleRemoveManager = async () => {
    if (!selectedStore) return; setSaving(true);
    try { await storesService.removeManager(selectedStore.id); toast.success('Manager removed'); closeModal(); await fetchData(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to remove manager'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (store: StoreType) => {
    setTogglingId(store.id);
    try { await storesService.toggleStatus(store.id, !store.isActive); await fetchData(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to update status'); }
    finally { setTogglingId(null); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const StoreForm = () => (
    <form id="store-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2"><label className="form-label">Store Name *</label><input className="form-input" value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} required placeholder="Enter store name"/></div>
        <div className="form-group"><label className="form-label">Store Code</label><input className="form-input" value={formData.code} onChange={e => setFormData({...formData,code:e.target.value})} placeholder="MAIN, BRANCH1"/></div>
        <div className="form-group"><label className="form-label">Store Type *</label><select className="form-input" value={formData.type} onChange={e => setFormData({...formData,type:e.target.value as any})} required><option value="retail">Retail Store</option><option value="fnb">Food & Beverage</option><option value="warehouse">Warehouse</option><option value="service">Service Center</option></select></div>
        <div className="form-group"><label className="form-label">Phone</label><input type="tel" className="form-input" value={formData.phone} onChange={e => setFormData({...formData,phone:e.target.value})} placeholder="08123456789"/></div>
        <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData,email:e.target.value})} placeholder="store@example.com"/></div>
        <div className="form-group col-span-2"><label className="form-label">Address</label><textarea className="form-input" value={formData.address} onChange={e => setFormData({...formData,address:e.target.value})} rows={2} placeholder="Street address"/></div>
        <div className="form-group"><label className="form-label">City</label><input className="form-input" value={formData.city} onChange={e => setFormData({...formData,city:e.target.value})} placeholder="City"/></div>
        <div className="form-group"><label className="form-label">Province</label><input className="form-input" value={formData.province} onChange={e => setFormData({...formData,province:e.target.value})} placeholder="Province"/></div>
        <div className="form-group"><label className="form-label">Postal Code</label><input className="form-input" value={formData.postalCode} onChange={e => setFormData({...formData,postalCode:e.target.value})} placeholder="12345"/></div>
        <div className="form-group"><label className="form-label">Manager</label><select className="form-input" value={formData.managerId} onChange={e => setFormData({...formData,managerId:e.target.value})}><option value="">No manager</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group"><label className="form-label">Receipt Header</label><textarea className="form-input" rows={2} value={formData.receiptHeader} onChange={e => setFormData({...formData,receiptHeader:e.target.value})} placeholder="Text shown at top of receipt"/></div>
        <div className="form-group"><label className="form-label">Receipt Footer</label><textarea className="form-input" rows={2} value={formData.receiptFooter} onChange={e => setFormData({...formData,receiptFooter:e.target.value})} placeholder="Text shown at bottom of receipt"/></div>
      </div>
      <div className="form-group">
        <label className="form-label">Receipt Logo</label>
        <ImageUpload
          value={formData.receiptLogoUrl}
          onChange={url => setFormData({...formData, receiptLogoUrl: url})}
          uploadEndpoint={selectedStore ? `/stores/${selectedStore.id}/upload-logo` : undefined}
          label="Upload Receipt Logo"
        />
      </div>
    </form>
  );

  return (
    <div>
      <PageHeader title="Store Management" description="Manage your stores, locations, and operations."
        action={<button className="btn btn-primary" onClick={() => openModal('create')}><Plus size={16}/> Add Store</button>} />

      <div className="flex flex-wrap gap-3 mb-6">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by name, code, city..." className="flex-1 min-w-[200px]" />
        <select className="form-input w-40" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option><option value="retail">Retail</option><option value="fnb">F&B</option><option value="warehouse">Warehouse</option><option value="service">Service</option>
        </select>
        <select className="form-input w-36" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
          <option value="">All Status</option><option value="true">Active</option><option value="false">Inactive</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : stores.length === 0 ? (
        <EmptyState icon={Store} title="No stores found" action={<button onClick={() => openModal('create')} className="btn btn-primary btn-sm"><Plus size={14}/> Add Store</button>} />
      ) : (
        <div className="card">
          <div className="table-container border-0">
            <table className="table">
              <thead><tr><th>Store</th><th>Type</th><th>Manager</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {stores.map(store => (
                  <tr key={store.id}>
                    <td><div className="font-semibold">{store.name}</div><div className="text-xs text-gray-400">{store.code && `${store.code} • `}{store.city || 'No location'}</div></td>
                    <td><span className={`badge ${STORE_TYPE_BADGE[store.type] || 'badge-gray'}`}>{STORE_TYPE_LABEL[store.type] || store.type}</span></td>
                    <td>{store.manager ? <div><div className="text-sm font-medium">{store.manager.name}</div><div className="text-xs text-gray-400">{store.manager.email}</div></div> : <span className="text-gray-400 text-sm">No manager</span>}</td>
                    <td>
                      <button onClick={() => toggleStatus(store)} disabled={togglingId === store.id}
                        className={`badge cursor-pointer border-0 ${store.isActive ? 'badge-success' : 'badge-gray'} ${togglingId === store.id ? 'opacity-50' : ''}`}>
                        {togglingId === store.id ? '...' : store.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal('view', store)} className="btn btn-ghost btn-icon btn-sm" title="View"><Eye size={14}/></button>
                        <button onClick={() => openModal('assignManager', store)} className="btn btn-ghost btn-icon btn-sm text-indigo-500" title="Assign Manager"><UserPlus size={14}/></button>
                        <button onClick={() => openModal('edit', store)} className="btn btn-ghost btn-icon btn-sm" title="Edit"><Edit size={14}/></button>
                        <button onClick={() => openModal('delete', store)} className="btn btn-ghost btn-icon btn-sm text-red-500" title="Delete"><Trash2 size={14}/></button>
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
      <Modal open={modalType === 'create' || modalType === 'edit'} onClose={closeModal} title={modalType === 'create' ? 'Add New Store' : 'Edit Store'} size="xl"
        footer={<><button onClick={closeModal} className="btn btn-outline" disabled={saving}>Cancel</button><button form="store-form" type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : null}{modalType === 'create' ? 'Create Store' : 'Save Changes'}</button></>}>
        <StoreForm />
      </Modal>

      {/* View Modal */}
      <Modal open={modalType === 'view'} onClose={closeModal} title="Store Details" size="lg"
        footer={<><button onClick={() => openModal('stats', selectedStore!)} className="btn btn-outline">View Stats</button><button onClick={() => openModal('edit', selectedStore!)} className="btn btn-primary"><Edit size={14}/> Edit</button></>}>
        {selectedStore && (
          <div className="space-y-4">
            <span className={`badge ${STORE_TYPE_BADGE[selectedStore.type] || 'badge-gray'}`}>{STORE_TYPE_LABEL[selectedStore.type]}</span>
            <div className="grid grid-cols-2 gap-3">
              {[['Name', selectedStore.name], ['Code', selectedStore.code||'—'], ['Phone', selectedStore.phone||'—'], ['Email', selectedStore.email||'—']].map(([l,v]) => (
                <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-semibold mt-0.5">{v}</p></div>
              ))}
              <div className="col-span-2"><p className="text-xs text-gray-400">Address</p><p className="font-semibold mt-0.5">{selectedStore.address||'—'}</p>{selectedStore.city && <p className="text-sm text-gray-500">{selectedStore.city}, {selectedStore.province} {selectedStore.postalCode}</p>}</div>
              <div className="col-span-2"><p className="text-xs text-gray-400">Manager</p>{selectedStore.manager ? <div><p className="font-semibold">{selectedStore.manager.name}</p><p className="text-sm text-gray-500">{selectedStore.manager.email}</p></div> : <p className="text-gray-400">No manager assigned</p>}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Manager Modal */}
      <Modal open={modalType === 'assignManager'} onClose={closeModal} title="Assign Manager"
        footer={<><button onClick={closeModal} className="btn btn-outline" disabled={saving}>Cancel</button>{selectedStore?.manager && <button onClick={handleRemoveManager} className="btn btn-danger btn-sm" disabled={saving}><UserX size={14}/> Remove</button>}<button form="manager-form" type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin"/> : null}Assign</button></>}>
        <form id="manager-form" onSubmit={handleAssignManager} className="space-y-4">
          <div className="bg-indigo-50 rounded-lg p-3 text-sm"><p className="text-indigo-600">Store: <strong>{selectedStore?.name}</strong></p><p className="text-indigo-500 text-xs mt-0.5">Current: {selectedStore?.manager?.name || 'None'}</p></div>
          <div className="form-group"><label className="form-label">Select Manager *</label><select className="form-input" value={managerForm.managerId} onChange={e => setManagerForm({managerId:e.target.value})} required><option value="">Select a manager</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</select></div>
        </form>
      </Modal>

      {/* Stats Modal */}
      <Modal open={modalType === 'stats'} onClose={closeModal} title="Store Statistics" size="sm">
        {storeStats && selectedStore && (
          <div className="space-y-3">
            <div className="bg-indigo-50 rounded-lg p-3"><p className="font-semibold text-indigo-800">{selectedStore.name}</p><p className="text-xs text-indigo-500">{selectedStore.code && `${selectedStore.code} • `}{selectedStore.city||'No location'}</p></div>
            <div className="grid grid-cols-2 gap-3">
              {[['Employees', storeStats.totalEmployees, 'text-indigo-600'], ['Products', storeStats.totalProducts, 'text-emerald-600'], ["Today's Sales", fmt(storeStats.todaySales), 'text-amber-600'], ["Month Sales", fmt(storeStats.monthSales), 'text-blue-600']].map(([l,v,c]) => (
                <div key={l as string} className="bg-gray-50 rounded-lg p-3 text-center"><div className={`text-xl font-bold ${c}`}>{v}</div><div className="text-xs text-gray-400 mt-0.5">{l}</div></div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <DeleteModal open={modalType === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={deleting}
        title="Delete Store" description={`Delete "${selectedStore?.name}"? This cannot be undone.`} />
    </div>
  );
}
