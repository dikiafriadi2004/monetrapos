'use client';

import { useState, useEffect } from 'react';
import { Store, Plus, Search, Edit, Trash2, Eye, UserPlus, UserX, X, MapPin, Clock, Phone, Mail, Building2 } from 'lucide-react';
import apiClient from '../../../lib/api-client';
import { API_ENDPOINTS } from '../../../lib/api-endpoints';

// Types
interface Store {
  id: string;
  name: string;
  code?: string;
  type: 'retail' | 'fnb' | 'warehouse' | 'service';
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  manager?: { id: string; name: string; email: string };
  managerId?: string;
  openingHours?: Record<string, { open: string; close: string }>;
  receiptHeader?: string;
  receiptFooter?: string;
  receiptLogoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface StoreStats {
  totalEmployees: number;
  totalProducts: number;
  todaySales: number;
  monthSales: number;
}

type ModalType = 'create' | 'edit' | 'view' | 'delete' | 'assignManager' | 'stats' | null;

const STORE_TYPE_CONFIG = {
  retail: { label: 'Retail Store', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' },
  fnb: { label: 'Food & Beverage', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' },
  warehouse: { label: 'Warehouse', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' },
  service: { label: 'Service Center', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)' },
};

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saving, setSaving] = useState(false);
  const [storeStats, setStoreStats] = useState<StoreStats | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'retail' as Store['type'],
    address: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    email: '',
    managerId: '',
    receiptHeader: '',
    receiptFooter: '',
    receiptLogoUrl: '',
    openingHours: {} as Record<string, { open: string; close: string }>,
  });

  // Manager assignment form
  const [managerForm, setManagerForm] = useState({ managerId: '' });

  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm, filterType, filterActive]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterType) params.append('type', filterType);
      if (filterActive) params.append('isActive', filterActive);

      const [storesRes, usersRes]: any = await Promise.all([
        apiClient.get(`${API_ENDPOINTS.STORES.BASE}?${params.toString()}`),
        apiClient.get(API_ENDPOINTS.USERS.BASE),
      ]);
      
      setStores(storesRes.data?.data || storesRes.data || []);
      setTotalPages(storesRes.data?.meta?.totalPages || 1);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async (type: ModalType, store?: Store) => {
    setModalType(type);
    setSelectedStore(store || null);
    
    if (type === 'edit' && store) {
      setFormData({
        name: store.name,
        code: store.code || '',
        type: store.type,
        address: store.address || '',
        city: store.city || '',
        province: store.province || '',
        postalCode: store.postalCode || '',
        phone: store.phone || '',
        email: store.email || '',
        managerId: store.managerId || '',
        receiptHeader: store.receiptHeader || '',
        receiptFooter: store.receiptFooter || '',
        receiptLogoUrl: store.receiptLogoUrl || '',
        openingHours: store.openingHours || {},
      });
    } else if (type === 'create') {
      setFormData({
        name: '',
        code: '',
        type: 'retail',
        address: '',
        city: '',
        province: '',
        postalCode: '',
        phone: '',
        email: '',
        managerId: '',
        receiptHeader: '',
        receiptFooter: '',
        receiptLogoUrl: '',
        openingHours: {},
      });
    } else if (type === 'assignManager' && store) {
      setManagerForm({ managerId: store.managerId || '' });
    } else if (type === 'stats' && store) {
      await fetchStoreStats(store.id);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedStore(null);
    setStoreStats(null);
  };

  const fetchStoreStats = async (storeId: string) => {
    try {
      const res: any = await apiClient.get(`${API_ENDPOINTS.STORES.BY_ID(storeId)}/stats`);
      setStoreStats(res.data?.stats || res.stats || null);
    } catch (err) {
      console.error('Failed to fetch store stats:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        managerId: formData.managerId || undefined,
      };

      if (modalType === 'create') {
        await apiClient.post(API_ENDPOINTS.STORES.BASE, payload);
      } else if (modalType === 'edit' && selectedStore) {
        await apiClient.patch(API_ENDPOINTS.STORES.BY_ID(selectedStore.id), payload);
      }
      closeModal();
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save store');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStore) return;
    setSaving(true);
    try {
      await apiClient.delete(API_ENDPOINTS.STORES.BY_ID(selectedStore.id));
      closeModal();
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete store');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;
    setSaving(true);
    try {
      await apiClient.post(`${API_ENDPOINTS.STORES.BY_ID(selectedStore.id)}/assign-manager`, {
        managerId: managerForm.managerId,
      });
      closeModal();
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign manager');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveManager = async () => {
    if (!selectedStore) return;
    if (!confirm('Remove manager from this store?')) return;
    setSaving(true);
    try {
      await apiClient.delete(`${API_ENDPOINTS.STORES.BY_ID(selectedStore.id)}/manager`);
      closeModal();
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove manager');
    } finally {
      setSaving(false);
    }
  };

  const toggleStoreStatus = async (store: Store) => {
    try {
      await apiClient.patch(API_ENDPOINTS.STORES.BY_ID(store.id), {
        isActive: !store.isActive,
      });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update store status');
    }
  };

  const formatOpeningHours = (hours?: Record<string, { open: string; close: string }>) => {
    if (!hours || Object.keys(hours).length === 0) return 'Not set';
    
    const firstDay = Object.keys(hours)[0];
    const firstHours = hours[firstDay];
    
    if (firstHours.open === 'closed') return 'Closed';
    
    return `${firstHours.open} - ${firstHours.close}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredStores = stores;

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Store Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage your stores, locations, and operations.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('create')}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Add Store
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-md)' }}>
          <div style={{ position: 'relative' }}>
            <Search 
              size={20} 
              style={{ 
                position: 'absolute', 
                left: 'var(--space-md)', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-tertiary)' 
              }} 
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, code, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          
          <select
            className="form-input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="retail">Retail</option>
            <option value="fnb">Food & Beverage</option>
            <option value="warehouse">Warehouse</option>
            <option value="service">Service</option>
          </select>

          <select
            className="form-input"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Store Table */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', 
          gap: 'var(--space-md)', 
          padding: 'var(--space-sm) var(--space-lg)', 
          borderBottom: '1px solid var(--border-subtle)', 
          color: 'var(--text-tertiary)', 
          fontSize: '0.8rem', 
          fontWeight: 600, 
          textTransform: 'uppercase' 
        }}>
          <div>Store</div>
          <div>Type</div>
          <div>Manager</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              Loading stores...
            </div>
          ) : filteredStores.length === 0 ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <Store size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
              <p>No stores found.</p>
            </div>
          ) : (
            filteredStores.map((store) => (
              <div 
                key={store.id} 
                className="animate-fade-in" 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', 
                  gap: 'var(--space-md)', 
                  padding: 'var(--space-md) var(--space-lg)', 
                  borderBottom: '1px solid var(--border-subtle)', 
                  alignItems: 'center' 
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{store.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    {store.code && `${store.code} • `}
                    {store.city || 'No location'}
                  </div>
                </div>
                <div>
                  <span 
                    className="badge" 
                    style={{ 
                      background: STORE_TYPE_CONFIG[store.type as keyof typeof STORE_TYPE_CONFIG].bg, 
                      color: STORE_TYPE_CONFIG[store.type as keyof typeof STORE_TYPE_CONFIG].color 
                    }}
                  >
                    {STORE_TYPE_CONFIG[store.type as keyof typeof STORE_TYPE_CONFIG].label}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  {store.manager ? (
                    <div>
                      <div style={{ fontWeight: 500 }}>{store.manager.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        {store.manager.email}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)' }}>No manager</span>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => toggleStoreStatus(store)}
                    className="badge"
                    style={{
                      background: store.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: store.isActive ? '#22c55e' : '#ef4444',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    {store.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => openModal('view', store)}
                    title="View Details"
                  >
                    <Eye size={14} />
                  </button>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => openModal('assignManager', store)}
                    title="Assign Manager"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  >
                    <UserPlus size={14} />
                  </button>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => openModal('edit', store)}
                    title="Edit Store"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => openModal('delete', store)}
                    title="Delete Store"
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 'var(--space-sm)', 
            padding: 'var(--space-lg)', 
            borderTop: '1px solid var(--border-subtle)' 
          }}>
            <button 
              className="btn btn-sm btn-outline" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span style={{ padding: 'var(--space-sm) var(--space-md)', color: 'var(--text-secondary)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              className="btn btn-sm btn-outline" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal - Will be added in next part */}
      {(modalType === 'create' || modalType === 'edit') && (
        <StoreFormModal
          isOpen={true}
          onClose={closeModal}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          users={users}
          saving={saving}
          isEdit={modalType === 'edit'}
        />
      )}

      {/* View Details Modal - Will be added in next part */}
      {modalType === 'view' && selectedStore && (
        <StoreDetailsModal
          store={selectedStore}
          onClose={closeModal}
          onEdit={() => openModal('edit', selectedStore)}
          onViewStats={() => openModal('stats', selectedStore)}
        />
      )}

      {/* Assign Manager Modal - Will be added in next part */}
      {modalType === 'assignManager' && selectedStore && (
        <AssignManagerModal
          store={selectedStore}
          users={users}
          managerForm={managerForm}
          setManagerForm={setManagerForm}
          onSubmit={handleAssignManager}
          onRemove={handleRemoveManager}
          onClose={closeModal}
          saving={saving}
        />
      )}

      {/* Store Stats Modal - Will be added in next part */}
      {modalType === 'stats' && selectedStore && storeStats && (
        <StoreStatsModal
          store={selectedStore}
          stats={storeStats}
          onClose={closeModal}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Delete Confirmation Modal */}
      {modalType === 'delete' && selectedStore && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.6)', 
          backdropFilter: 'blur(4px)', 
          zIndex: 9999, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div className="glass-panel animate-fade-in" style={{ 
            width: '450px', 
            padding: 'var(--space-xl)', 
            background: '#111827' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>Delete Store</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>

            <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
              Are you sure you want to delete <strong>{selectedStore.name}</strong>? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ flex: 1 }} 
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flex: 1, background: 'var(--danger)' }}
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Delete Store'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Store Form Modal Component
function StoreFormModal({ isOpen, onClose, onSubmit, formData, setFormData, users, saving, isEdit }: any) {
  const updateOpeningHours = (day: string, field: 'open' | 'close', value: string) => {
    setFormData({
      ...formData,
      openingHours: {
        ...formData.openingHours,
        [day]: {
          ...formData.openingHours[day],
          [field]: value,
        },
      },
    });
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.6)', 
      backdropFilter: 'blur(4px)', 
      zIndex: 9999, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      overflowY: 'auto',
      padding: 'var(--space-xl)'
    }}>
      <div className="glass-panel animate-fade-in" style={{ 
        width: '800px', 
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 'var(--space-xl)', 
        background: '#111827',
        margin: 'var(--space-xl) 0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.25rem' }}>
            {isEdit ? 'Edit Store' : 'Add New Store'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={onSubmit}>
          {/* Basic Information */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
              Basic Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Store Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter store name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Store Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="MAIN, BRANCH1, etc."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Store Type *</label>
                <select
                  className="form-input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  required
                >
                  <option value="retail">Retail Store</option>
                  <option value="fnb">Food & Beverage</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="service">Service Center</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
              Contact Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="08123456789"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="store@example.com"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
              Address
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Street Address</label>
                <textarea
                  className="form-input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Province</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="Province"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Postal Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="12345"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Manager</label>
                <select
                  className="form-input"
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                >
                  <option value="">No manager</option>
                  {users.map((user: User) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Receipt Settings */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
              Receipt Settings
            </h3>
            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Receipt Header</label>
                <textarea
                  className="form-input"
                  value={formData.receiptHeader}
                  onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                  placeholder="Thank you for shopping with us!"
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Footer</label>
                <textarea
                  className="form-input"
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  placeholder="Items purchased cannot be exchanged."
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Logo URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={formData.receiptLogoUrl}
                  onChange={(e) => setFormData({ ...formData, receiptLogoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              style={{ flex: 1 }} 
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              disabled={saving}
            >
              {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Store')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Store Details Modal Component
function StoreDetailsModal({ store, onClose, onEdit, onViewStats }: any) {
  const formatOpeningHours = (hours?: Record<string, { open: string; close: string }>) => {
    if (!hours || Object.keys(hours).length === 0) return null;
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        {DAYS_OF_WEEK.map((day) => {
          const dayHours = hours[day];
          if (!dayHours) return null;
          
          return (
            <div key={day} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-xs)', fontSize: '0.9rem' }}>
              <span style={{ textTransform: 'capitalize', color: 'var(--text-tertiary)' }}>{day}:</span>
              <span style={{ fontWeight: 500 }}>
                {dayHours.open === 'closed' ? 'Closed' : `${dayHours.open} - ${dayHours.close}`}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.6)', 
      backdropFilter: 'blur(4px)', 
      zIndex: 9999, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      overflowY: 'auto'
    }}>
      <div className="glass-panel animate-fade-in" style={{ 
        width: '700px', 
        padding: 'var(--space-xl)', 
        background: '#111827',
        margin: 'var(--space-xl)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Store Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Store Type Badge */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <span 
            className="badge" 
            style={{ 
              background: STORE_TYPE_CONFIG[store.type as keyof typeof STORE_TYPE_CONFIG].bg, 
              color: STORE_TYPE_CONFIG[store.type as keyof typeof STORE_TYPE_CONFIG].color,
              fontSize: '1rem',
              padding: 'var(--space-sm) var(--space-md)'
            }}
          >
            {STORE_TYPE_CONFIG[store.type as keyof typeof STORE_TYPE_CONFIG].label}
          </span>
        </div>

        {/* Store Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Store Name</div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{store.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Store Code</div>
            <div style={{ fontWeight: 600 }}>{store.code || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
              <Phone size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Phone
            </div>
            <div>{store.phone || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
              <Mail size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Email
            </div>
            <div>{store.email || '-'}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
              <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Address
            </div>
            <div>{store.address || '-'}</div>
            {store.city && (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {store.city}, {store.province} {store.postalCode}
              </div>
            )}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
              <Building2 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Manager
            </div>
            {store.manager ? (
              <div>
                <div style={{ fontWeight: 600 }}>{store.manager.name}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{store.manager.email}</div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-tertiary)' }}>No manager assigned</div>
            )}
          </div>
        </div>

        {/* Opening Hours */}
        {store.openingHours && Object.keys(store.openingHours).length > 0 && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }}>
              <Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Opening Hours
            </div>
            <div className="glass-panel" style={{ padding: 'var(--space-md)' }}>
              {formatOpeningHours(store.openingHours)}
            </div>
          </div>
        )}

        {/* Receipt Settings */}
        {(store.receiptHeader || store.receiptFooter || store.receiptLogoUrl) && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }}>
              Receipt Settings
            </div>
            <div className="glass-panel" style={{ padding: 'var(--space-md)' }}>
              {store.receiptHeader && (
                <div style={{ marginBottom: 'var(--space-sm)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Header:</div>
                  <div style={{ fontSize: '0.9rem' }}>{store.receiptHeader}</div>
                </div>
              )}
              {store.receiptFooter && (
                <div style={{ marginBottom: 'var(--space-sm)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Footer:</div>
                  <div style={{ fontSize: '0.9rem' }}>{store.receiptFooter}</div>
                </div>
              )}
              {store.receiptLogoUrl && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Logo URL:</div>
                  <div style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{store.receiptLogoUrl}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <button 
            className="btn btn-outline" 
            style={{ flex: 1 }}
            onClick={onViewStats}
          >
            View Statistics
          </button>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1 }}
            onClick={onEdit}
          >
            <Edit size={16} style={{ marginRight: '6px' }} />
            Edit Store
          </button>
        </div>
      </div>
    </div>
  );
}

// Assign Manager Modal Component
function AssignManagerModal({ store, users, managerForm, setManagerForm, onSubmit, onRemove, onClose, saving }: any) {
  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.6)', 
      backdropFilter: 'blur(4px)', 
      zIndex: 9999, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div className="glass-panel animate-fade-in" style={{ 
        width: '500px', 
        padding: 'var(--space-xl)', 
        background: '#111827' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Assign Manager</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Current Manager Display */}
        <div className="glass-panel" style={{ 
          padding: 'var(--space-md)', 
          marginBottom: 'var(--space-lg)', 
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Store: {store.name}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            Current Manager: {store.manager ? store.manager.name : 'None'}
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="form-label">Select Manager *</label>
            <select
              className="form-input"
              value={managerForm.managerId}
              onChange={(e) => setManagerForm({ managerId: e.target.value })}
              required
            >
              <option value="">Select a manager</option>
              {users.map((user: User) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            {store.manager && (
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ flex: 1, borderColor: 'var(--danger)', color: 'var(--danger)' }}
                onClick={onRemove}
                disabled={saving}
              >
                <UserX size={16} style={{ marginRight: '6px' }} />
                Remove Manager
              </button>
            )}
            <button 
              type="button" 
              className="btn btn-outline" 
              style={{ flex: 1 }} 
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              disabled={saving}
            >
              {saving ? 'Assigning...' : 'Assign Manager'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Store Stats Modal Component
function StoreStatsModal({ store, stats, onClose, formatCurrency }: any) {
  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.6)', 
      backdropFilter: 'blur(4px)', 
      zIndex: 9999, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div className="glass-panel animate-fade-in" style={{ 
        width: '600px', 
        padding: 'var(--space-xl)', 
        background: '#111827' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Store Statistics</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        <div className="glass-panel" style={{ 
          padding: 'var(--space-md)', 
          marginBottom: 'var(--space-lg)', 
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{store.name}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            {store.code && `${store.code} • `}
            {store.city || 'No location'}
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 'var(--space-md)', 
          marginBottom: 'var(--space-lg)' 
        }}>
          <div className="glass-panel" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
              {stats.totalEmployees || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Total Employees</div>
          </div>
          <div className="glass-panel" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
              {stats.totalProducts || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Total Products</div>
          </div>
          <div className="glass-panel" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>
              {formatCurrency(stats.todaySales || 0)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Today's Sales</div>
          </div>
          <div className="glass-panel" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)' }}>
              {formatCurrency(stats.monthSales || 0)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>This Month's Sales</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
