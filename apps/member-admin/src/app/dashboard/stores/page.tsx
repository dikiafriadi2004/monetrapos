'use client';

import { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Edit, Trash2, Eye, UserPlus, UserX, Loader2 } from 'lucide-react';
import { storesService, Store as StoreType, StoreStats } from '@/services/stores.service';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Modal, DeleteModal, PageHeader, SearchInput, EmptyState, LoadingSpinner, Pagination } from '@/components/ui';
import ImageUpload from '@/components/ImageUpload';

interface User { id: string; name: string; email: string; }
type ModalType = 'create' | 'edit' | 'view' | 'delete' | 'assignManager' | 'stats' | null;

type FormData = {
  name: string; code: string; type: string; address: string; city: string;
  province: string; postalCode: string; phone: string; email: string;
  managerId: string; receiptHeader: string; receiptFooter: string;
  receiptLogoUrl: string; openingHours: Record<string, { open: string; close: string }>;
};

const STORE_TYPE_BADGE: Record<string, string> = {
  retail: 'badge-primary', fnb: 'badge-success', restaurant: 'badge-success',
  cafe: 'badge-success', laundry: 'badge-info', warehouse: 'badge-warning',
  service: 'bg-purple-100 text-purple-700', other: 'badge-gray',
};
const STORE_TYPE_LABEL: Record<string, string> = {
  retail: 'Retail', fnb: 'Food & Beverage', restaurant: 'Restaurant',
  cafe: 'Cafe', laundry: 'Laundry', warehouse: 'Warehouse',
  service: 'Service', other: 'Other',
};

const DEFAULT_FORM: FormData = {
  name: '', code: '', type: 'retail', address: '', city: '', province: '',
  postalCode: '', phone: '', email: '', managerId: '', receiptHeader: '',
  receiptFooter: '', receiptLogoUrl: '', openingHours: {},
};

// ── StoreForm as standalone component (outside StoresPage to prevent remount) ──
interface StoreFormProps {
  formData: FormData;
  onChange: (data: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  users: User[];
  selectedStore: StoreType | null;
}

function StoreForm({ formData, onChange, onSubmit, users, selectedStore }: StoreFormProps) {
  const set = (field: keyof FormData, value: string) =>
    onChange({ ...formData, [field]: value });

  return (
    <form id="store-form" onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2">
          <label className="form-label">Nama Toko *</label>
          <input className="form-input" value={formData.name} onChange={e => set('name', e.target.value)} required placeholder="Contoh: Toko Saya" />
        </div>
        <div className="form-group">
          <label className="form-label">Kode Toko</label>
          <input className="form-input" value={formData.code} onChange={e => set('code', e.target.value)} placeholder="MAIN, CABANG1" />
        </div>
        <div className="form-group">
          <label className="form-label">Tipe Toko *</label>
          <select className="form-input" value={formData.type} onChange={e => set('type', e.target.value)} required>
            <option value="retail">Retail / Toko</option>
            <option value="fnb">Food & Beverage</option>
            <option value="restaurant">Restoran</option>
            <option value="cafe">Cafe / Kafe</option>
            <option value="laundry">Laundry</option>
            <option value="warehouse">Gudang</option>
            <option value="service">Service Center</option>
            <option value="other">Lainnya</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Telepon</label>
          <input type="tel" className="form-input" value={formData.phone} onChange={e => set('phone', e.target.value)} placeholder="08123456789" />
        </div>
        <div className="form-group">
          <label className="form-label">Email (opsional)</label>
          <input type="email" className="form-input" value={formData.email} onChange={e => set('email', e.target.value)} placeholder="toko@example.com" />
        </div>
        <div className="form-group col-span-2">
          <label className="form-label">Alamat</label>
          <textarea className="form-input" value={formData.address} onChange={e => set('address', e.target.value)} rows={2} placeholder="Jl. Contoh No. 1" />
        </div>
        <div className="form-group">
          <label className="form-label">Kota</label>
          <input className="form-input" value={formData.city} onChange={e => set('city', e.target.value)} placeholder="Jakarta" />
        </div>
        <div className="form-group">
          <label className="form-label">Provinsi</label>
          <input className="form-input" value={formData.province} onChange={e => set('province', e.target.value)} placeholder="DKI Jakarta" />
        </div>
        <div className="form-group">
          <label className="form-label">Kode Pos</label>
          <input className="form-input" value={formData.postalCode} onChange={e => set('postalCode', e.target.value)} placeholder="12345" />
        </div>
        <div className="form-group">
          <label className="form-label">Manager</label>
          <select className="form-input" value={formData.managerId} onChange={e => set('managerId', e.target.value)}>
            <option value="">Tidak ada manager</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Pengaturan Struk</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Header Struk</label>
            <textarea className="form-input" rows={2} value={formData.receiptHeader} onChange={e => set('receiptHeader', e.target.value)} placeholder="Teks di bagian atas struk" />
          </div>
          <div className="form-group">
            <label className="form-label">Footer Struk</label>
            <textarea className="form-input" rows={2} value={formData.receiptFooter} onChange={e => set('receiptFooter', e.target.value)} placeholder="Teks di bagian bawah struk" />
          </div>
        </div>
        <div className="form-group mt-2">
          <label className="form-label">Logo Struk</label>
          <ImageUpload
            value={formData.receiptLogoUrl}
            onChange={url => onChange({ ...formData, receiptLogoUrl: url })}
            uploadEndpoint={selectedStore ? `/stores/${selectedStore.id}/upload-logo` : undefined}
            label="Upload Logo Struk"
          />
          {formData.receiptLogoUrl && (
            <div className="mt-2 flex items-center gap-2">
              <img src={formData.receiptLogoUrl} alt="Logo preview" className="h-12 object-contain border rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => onChange({ ...formData, receiptLogoUrl: '' })}>Hapus logo</button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
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
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
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
    } catch (err) { console.error('Failed to fetch stores:', err); toast.error('Gagal memuat data toko'); }
    finally { setLoading(false); }
  };

  const openModal = async (type: ModalType, store?: StoreType) => {
    setModalType(type); setSelectedStore(store || null);
    if (type === 'edit' && store) {
      setFormData({
        name: store.name, code: store.code || '', type: store.type,
        address: store.address || '', city: store.city || '', province: store.province || '',
        postalCode: store.postalCode || '', phone: store.phone || '', email: store.email || '',
        managerId: store.managerId || '', receiptHeader: store.receiptHeader || '',
        receiptFooter: store.receiptFooter || '', receiptLogoUrl: store.receiptLogoUrl || '',
        openingHours: store.openingHours || {},
      });
    } else if (type === 'create') {
      setFormData(DEFAULT_FORM);
    } else if (type === 'assignManager' && store) {
      setManagerForm({ managerId: store.managerId || '' });
    } else if (type === 'stats' && store) {
      const stats = await storesService.getStats(store.id).catch(() => null);
      setStoreStats(stats);
    }
  };

  const closeModal = () => { setModalType(null); setSelectedStore(null); setStoreStats(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Nama toko wajib diisi'); return; }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        type: formData.type as any,
        email: formData.email || undefined,
        managerId: formData.managerId || undefined,
      };
      if (modalType === 'create') { await storesService.create(payload); toast.success('Toko berhasil dibuat'); }
      else if (modalType === 'edit' && selectedStore) { await storesService.update(selectedStore.id, payload); toast.success('Toko berhasil diperbarui'); }
      closeModal(); await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Gagal menyimpan toko');
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedStore) return; setDeleting(true);
    try { await storesService.delete(selectedStore.id); toast.success('Toko dihapus'); closeModal(); await fetchData(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal menghapus toko'); }
    finally { setDeleting(false); }
  };

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedStore) return; setSaving(true);
    try { await storesService.assignManager(selectedStore.id, managerForm.managerId); toast.success('Manager berhasil ditugaskan'); closeModal(); await fetchData(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal menugaskan manager'); }
    finally { setSaving(false); }
  };

  const handleRemoveManager = async () => {
    if (!selectedStore) return; setSaving(true);
    try { await storesService.removeManager(selectedStore.id); toast.success('Manager dihapus'); closeModal(); await fetchData(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal menghapus manager'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (store: StoreType) => {
    setTogglingId(store.id);
    try { await storesService.toggleStatus(store.id, !store.isActive); await fetchData(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Gagal mengubah status'); }
    finally { setTogglingId(null); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <div>
      <PageHeader title="Manajemen Toko" description="Kelola toko, lokasi, dan operasional Anda."
        action={<button className="btn btn-primary" onClick={() => openModal('create')}><Plus size={16} /> Tambah Toko</button>} />

      <div className="flex flex-wrap gap-3 mb-6">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Cari nama, kode, kota..." className="flex-1 min-w-[200px]" />
        <select className="form-input w-44" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Semua Tipe</option>
          <option value="retail">Retail</option>
          <option value="fnb">F&B</option>
          <option value="restaurant">Restoran</option>
          <option value="cafe">Cafe</option>
          <option value="laundry">Laundry</option>
          <option value="warehouse">Gudang</option>
          <option value="service">Service</option>
          <option value="other">Lainnya</option>
        </select>
        <select className="form-input w-36" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : stores.length === 0 ? (
        <EmptyState icon={Store} title="Belum ada toko" action={<button onClick={() => openModal('create')} className="btn btn-primary btn-sm"><Plus size={14} /> Tambah Toko</button>} />
      ) : (
        <div className="card">
          <div className="table-container border-0">
            <table className="table">
              <thead><tr><th>Toko</th><th>Tipe</th><th>Manager</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
              <tbody>
                {stores.map(store => (
                  <tr key={store.id}>
                    <td>
                      <div className="font-semibold">{store.name}</div>
                      <div className="text-xs text-gray-400">{store.code && `${store.code} • `}{store.city || 'Belum ada lokasi'}</div>
                    </td>
                    <td><span className={`badge ${STORE_TYPE_BADGE[store.type] || 'badge-gray'}`}>{STORE_TYPE_LABEL[store.type] || store.type}</span></td>
                    <td>{store.manager ? <div><div className="text-sm font-medium">{store.manager.name}</div><div className="text-xs text-gray-400">{store.manager.email}</div></div> : <span className="text-gray-400 text-sm">Belum ada</span>}</td>
                    <td>
                      <button onClick={() => toggleStatus(store)} disabled={togglingId === store.id}
                        className={`badge cursor-pointer border-0 ${store.isActive ? 'badge-success' : 'badge-gray'} ${togglingId === store.id ? 'opacity-50' : ''}`}>
                        {togglingId === store.id ? '...' : store.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal('view', store)} className="btn btn-ghost btn-icon btn-sm" title="Lihat"><Eye size={14} /></button>
                        <button onClick={() => openModal('assignManager', store)} className="btn btn-ghost btn-icon btn-sm text-indigo-500" title="Tugaskan Manager"><UserPlus size={14} /></button>
                        <button onClick={() => openModal('edit', store)} className="btn btn-ghost btn-icon btn-sm" title="Edit"><Edit size={14} /></button>
                        <button onClick={() => openModal('delete', store)} className="btn btn-ghost btn-icon btn-sm text-red-500" title="Hapus"><Trash2 size={14} /></button>
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
      <Modal open={modalType === 'create' || modalType === 'edit'} onClose={closeModal}
        title={modalType === 'create' ? 'Tambah Toko Baru' : 'Edit Toko'} size="xl"
        footer={
          <>
            <button onClick={closeModal} className="btn btn-outline" disabled={saving}>Batal</button>
            <button form="store-form" type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1" />}
              {modalType === 'create' ? 'Buat Toko' : 'Simpan Perubahan'}
            </button>
          </>
        }>
        <StoreForm
          formData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          users={users}
          selectedStore={selectedStore}
        />
      </Modal>

      {/* View Modal */}
      <Modal open={modalType === 'view'} onClose={closeModal} title="Detail Toko" size="lg"
        footer={
          <>
            <button onClick={() => openModal('stats', selectedStore!)} className="btn btn-outline">Lihat Statistik</button>
            <button onClick={() => openModal('edit', selectedStore!)} className="btn btn-primary"><Edit size={14} /> Edit</button>
          </>
        }>
        {selectedStore && (
          <div className="space-y-4">
            <span className={`badge ${STORE_TYPE_BADGE[selectedStore.type] || 'badge-gray'}`}>{STORE_TYPE_LABEL[selectedStore.type] || selectedStore.type}</span>
            <div className="grid grid-cols-2 gap-3">
              {[['Nama', selectedStore.name], ['Kode', selectedStore.code || '—'], ['Telepon', selectedStore.phone || '—'], ['Email', selectedStore.email || '—']].map(([l, v]) => (
                <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-semibold mt-0.5">{v}</p></div>
              ))}
              <div className="col-span-2"><p className="text-xs text-gray-400">Alamat</p><p className="font-semibold mt-0.5">{selectedStore.address || '—'}</p>{selectedStore.city && <p className="text-sm text-gray-500">{selectedStore.city}, {selectedStore.province} {selectedStore.postalCode}</p>}</div>
              <div className="col-span-2"><p className="text-xs text-gray-400">Manager</p>{selectedStore.manager ? <div><p className="font-semibold">{selectedStore.manager.name}</p><p className="text-sm text-gray-500">{selectedStore.manager.email}</p></div> : <p className="text-gray-400">Belum ada manager</p>}</div>
              {selectedStore.receiptLogoUrl && (
                <div className="col-span-2"><p className="text-xs text-gray-400 mb-1">Logo Struk</p><img src={selectedStore.receiptLogoUrl} alt="Logo" className="h-12 object-contain border rounded" /></div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Manager Modal */}
      <Modal open={modalType === 'assignManager'} onClose={closeModal} title="Tugaskan Manager"
        footer={
          <>
            <button onClick={closeModal} className="btn btn-outline" disabled={saving}>Batal</button>
            {selectedStore?.manager && <button onClick={handleRemoveManager} className="btn btn-danger btn-sm" disabled={saving}><UserX size={14} /> Hapus Manager</button>}
            <button form="manager-form" type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1" />}Tugaskan
            </button>
          </>
        }>
        <form id="manager-form" onSubmit={handleAssignManager} className="space-y-4">
          <div className="bg-indigo-50 rounded-lg p-3 text-sm">
            <p className="text-indigo-600">Toko: <strong>{selectedStore?.name}</strong></p>
            <p className="text-indigo-500 text-xs mt-0.5">Manager saat ini: {selectedStore?.manager?.name || 'Belum ada'}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Pilih Manager *</label>
            <select className="form-input" value={managerForm.managerId} onChange={e => setManagerForm({ managerId: e.target.value })} required>
              <option value="">Pilih manager</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
        </form>
      </Modal>

      {/* Stats Modal */}
      <Modal open={modalType === 'stats'} onClose={closeModal} title="Statistik Toko" size="sm">
        {storeStats && selectedStore && (
          <div className="space-y-3">
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="font-semibold text-indigo-800">{selectedStore.name}</p>
              <p className="text-xs text-indigo-500">{selectedStore.code && `${selectedStore.code} • `}{selectedStore.city || 'Belum ada lokasi'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['Karyawan', storeStats.totalEmployees, 'text-indigo-600'], ['Produk', storeStats.totalProducts, 'text-emerald-600'], ['Penjualan Hari Ini', fmt(storeStats.todaySales), 'text-amber-600'], ['Penjualan Bulan Ini', fmt(storeStats.monthSales), 'text-blue-600']].map(([l, v, c]) => (
                <div key={l as string} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className={`text-xl font-bold ${c}`}>{v}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <DeleteModal open={modalType === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={deleting}
        title="Hapus Toko" description={`Hapus "${selectedStore?.name}"? Tindakan ini tidak dapat dibatalkan.`} />
    </div>
  );
}
