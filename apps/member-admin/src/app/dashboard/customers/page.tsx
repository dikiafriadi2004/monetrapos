'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit, Trash2, Eye, Gift, History, X } from 'lucide-react';
import { api } from '../../../lib/api';

// Types
interface Customer {
  id: string;
  customerNumber: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  loyaltyPoints: number;
  loyaltyTier: 'regular' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  totalOrders: number;
  dateOfBirth?: string;
  gender?: string;
  notes?: string;
  firstPurchaseAt?: string;
  lastPurchaseAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Store {
  id: string;
  name: string;
}

type ModalType = 'create' | 'edit' | 'view' | 'loyalty' | 'purchaseHistory' | 'loyaltyHistory' | 'delete' | null;

const TIER_COLORS = {
  regular: { bg: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' },
  silver: { bg: 'rgba(192, 192, 192, 0.2)', color: '#c0c0c0' },
  gold: { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' },
  platinum: { bg: 'rgba(147, 197, 253, 0.2)', color: '#93c5fd' },
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

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    storeId: '',
  });

  // Loyalty form state
  const [loyaltyForm, setLoyaltyForm] = useState({
    action: 'add' as 'add' | 'redeem',
    points: '',
    amount: '',
    description: '',
  });

  // Purchase history state
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [loyaltyHistory, setLoyaltyHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customersRes, storesRes]: any = await Promise.all([
        api.get(`/customers?page=${currentPage}&limit=10&search=${searchTerm}`),
        api.get('/stores'),
      ]);
      
      setCustomers(customersRes.data || customersRes || []);
      setTotalPages(customersRes.meta?.totalPages || 1);
      setStores(storesRes || []);
      
      if (storesRes.length > 0 && !formData.storeId) {
        setFormData(prev => ({ ...prev, storeId: storesRes[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: ModalType, customer?: Customer) => {
    setModalType(type);
    setSelectedCustomer(customer || null);
    
    if (type === 'edit' && customer) {
      setFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        postalCode: customer.postalCode || '',
        storeId: stores[0]?.id || '',
      });
    } else if (type === 'create') {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
        storeId: stores[0]?.id || '',
      });
    } else if (type === 'loyalty' && customer) {
      setLoyaltyForm({
        action: 'add',
        points: '',
        amount: '',
        description: '',
      });
    } else if (type === 'purchaseHistory' && customer) {
      fetchPurchaseHistory(customer.id);
    } else if (type === 'loyaltyHistory' && customer) {
      fetchLoyaltyHistory(customer.id);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedCustomer(null);
    setPurchaseHistory([]);
    setLoyaltyHistory([]);
  };

  const fetchPurchaseHistory = async (customerId: string) => {
    try {
      const res: any = await api.get(`/customers/${customerId}/purchase-history?limit=20`);
      setPurchaseHistory(res.data || res || []);
    } catch (err) {
      console.error('Failed to fetch purchase history:', err);
    }
  };

  const fetchLoyaltyHistory = async (customerId: string) => {
    try {
      const res: any = await api.get(`/customers/${customerId}/loyalty-history?limit=20`);
      setLoyaltyHistory(res.data || res || []);
    } catch (err) {
      console.error('Failed to fetch loyalty history:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalType === 'create') {
        await api.post('/customers', formData);
      } else if (modalType === 'edit' && selectedCustomer) {
        await api.patch(`/customers/${selectedCustomer.id}`, formData);
      }
      closeModal();
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      await api.delete(`/customers/${selectedCustomer.id}`);
      closeModal();
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete customer');
    } finally {
      setSaving(false);
    }
  };

  const handleLoyaltySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      const endpoint = loyaltyForm.action === 'add' 
        ? '/customers/loyalty/add-points' 
        : '/customers/loyalty/redeem-points';
      
      await api.post(endpoint, {
        customerId: selectedCustomer.id,
        points: parseInt(loyaltyForm.points),
        amount: loyaltyForm.amount ? parseFloat(loyaltyForm.amount) : undefined,
        description: loyaltyForm.description || undefined,
      });
      
      closeModal();
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process loyalty points');
    } finally {
      setSaving(false);
    }
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

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.customerNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Customer Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage customer profiles, loyalty points, and purchase history.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('create')}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Add Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
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
            placeholder="Search by name, email, phone, or customer number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="glass-panel" style={{ padding: 0 }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1.5fr', 
          gap: 'var(--space-md)', 
          padding: 'var(--space-sm) var(--space-lg)', 
          borderBottom: '1px solid var(--border-subtle)', 
          color: 'var(--text-tertiary)', 
          fontSize: '0.8rem', 
          fontWeight: 600, 
          textTransform: 'uppercase' 
        }}>
          <div>Customer</div>
          <div>Contact</div>
          <div>Loyalty Points</div>
          <div>Tier</div>
          <div>Total Spent</div>
          <div>Actions</div>
        </div>
        
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <Users size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
              <p>No customers found.</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div 
                key={customer.id} 
                className="animate-fade-in" 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1.5fr', 
                  gap: 'var(--space-md)', 
                  padding: 'var(--space-md) var(--space-lg)', 
                  borderBottom: '1px solid var(--border-subtle)', 
                  alignItems: 'center' 
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{customer.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    {customer.customerNumber}
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  <div>{customer.phone || '-'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {customer.email || '-'}
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  {customer.loyaltyPoints.toLocaleString()} pts
                </div>
                <div>
                  <span 
                    className="badge" 
                    style={{ 
                      background: TIER_COLORS[customer.loyaltyTier].bg, 
                      color: TIER_COLORS[customer.loyaltyTier].color,
                      textTransform: 'capitalize'
                    }}
                  >
                    {customer.loyaltyTier}
                  </span>
                </div>
                <div style={{ fontWeight: 500 }}>
                  {formatCurrency(Number(customer.totalSpent))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => openModal('view', customer)}
                    title="View Details"
                  >
                    <Eye size={14} />
                  </button>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => openModal('loyalty', customer)}
                    title="Manage Loyalty Points"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  >
                    <Gift size={14} />
                  </button>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => openModal('edit', customer)}
                    title="Edit Customer"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => openModal('delete', customer)}
                    title="Delete Customer"
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

      {/* Create/Edit Modal */}
      {(modalType === 'create' || modalType === 'edit') && (
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
            width: '600px', 
            padding: 'var(--space-xl)', 
            background: '#111827',
            margin: 'var(--space-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ fontSize: '1.25rem' }}>
                {modalType === 'create' ? 'Add New Customer' : 'Edit Customer'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="customer@example.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="081234567890"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Address</label>
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
                  <label className="form-label">Postal Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="12345"
                  />
                </div>

                {modalType === 'create' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Store *</label>
                    <select
                      className="form-input"
                      value={formData.storeId}
                      onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                      required
                    >
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
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
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (modalType === 'create' ? 'Create Customer' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {modalType === 'view' && selectedCustomer && (
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
              <h2 style={{ fontSize: '1.25rem' }}>Customer Details</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>

            {/* Customer Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Customer Number</div>
                <div style={{ fontWeight: 600 }}>{selectedCustomer.customerNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Name</div>
                <div style={{ fontWeight: 600 }}>{selectedCustomer.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Email</div>
                <div>{selectedCustomer.email || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Phone</div>
                <div>{selectedCustomer.phone || '-'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Address</div>
                <div>{selectedCustomer.address || '-'}</div>
                {selectedCustomer.city && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {selectedCustomer.city} {selectedCustomer.postalCode}
                  </div>
                )}
              </div>
            </div>

            {/* Loyalty Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: 'var(--space-md)', 
              marginBottom: 'var(--space-xl)' 
            }}>
              <div className="glass-panel" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {selectedCustomer.loyaltyPoints.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Loyalty Points</div>
              </div>
              <div className="glass-panel" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  <span 
                    className="badge" 
                    style={{ 
                      background: TIER_COLORS[selectedCustomer.loyaltyTier].bg, 
                      color: TIER_COLORS[selectedCustomer.loyaltyTier].color,
                      textTransform: 'capitalize',
                      fontSize: '1rem'
                    }}
                  >
                    {selectedCustomer.loyaltyTier}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Tier</div>
              </div>
              <div className="glass-panel" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                  {selectedCustomer.totalOrders}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Total Orders</div>
              </div>
              <div className="glass-panel" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--warning)' }}>
                  {formatCurrency(Number(selectedCustomer.totalSpent))}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Total Spent</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1 }}
                onClick={() => openModal('purchaseHistory', selectedCustomer)}
              >
                <History size={16} style={{ marginRight: '6px' }} />
                Purchase History
              </button>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1, borderColor: 'var(--primary)', color: 'var(--primary)' }}
                onClick={() => openModal('loyaltyHistory', selectedCustomer)}
              >
                <Gift size={16} style={{ marginRight: '6px' }} />
                Loyalty History
              </button>
            </div>

            {/* Dates */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              gap: 'var(--space-md)', 
              padding: 'var(--space-md)', 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem'
            }}>
              <div>
                <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>Member Since</div>
                <div>{formatDate(selectedCustomer.createdAt)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>First Purchase</div>
                <div>{selectedCustomer.firstPurchaseAt ? formatDate(selectedCustomer.firstPurchaseAt) : '-'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>Last Purchase</div>
                <div>{selectedCustomer.lastPurchaseAt ? formatDate(selectedCustomer.lastPurchaseAt) : '-'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button className="btn btn-outline" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Loyalty Points Modal */}
      {modalType === 'loyalty' && selectedCustomer && (
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
              <h2 style={{ fontSize: '1.25rem' }}>Manage Loyalty Points</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>

            {/* Current Points Display */}
            <div className="glass-panel" style={{ 
              padding: 'var(--space-lg)', 
              marginBottom: 'var(--space-lg)', 
              textAlign: 'center',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {selectedCustomer.name}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
                {selectedCustomer.loyaltyPoints.toLocaleString()} pts
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                Current Balance ≈ {formatCurrency(selectedCustomer.loyaltyPoints * 100)}
              </div>
            </div>

            <form onSubmit={handleLoyaltySubmit}>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Action</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                  <button
                    type="button"
                    className={loyaltyForm.action === 'add' ? 'btn btn-primary' : 'btn btn-outline'}
                    onClick={() => setLoyaltyForm({ ...loyaltyForm, action: 'add' })}
                    style={{ background: loyaltyForm.action === 'add' ? 'var(--success)' : undefined }}
                  >
                    Add Points
                  </button>
                  <button
                    type="button"
                    className={loyaltyForm.action === 'redeem' ? 'btn btn-primary' : 'btn btn-outline'}
                    onClick={() => setLoyaltyForm({ ...loyaltyForm, action: 'redeem' })}
                    style={{ background: loyaltyForm.action === 'redeem' ? 'var(--warning)' : undefined }}
                  >
                    Redeem Points
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Points *</label>
                <input
                  type="number"
                  className="form-input"
                  value={loyaltyForm.points}
                  onChange={(e) => setLoyaltyForm({ ...loyaltyForm, points: e.target.value })}
                  required
                  min="1"
                  max={loyaltyForm.action === 'redeem' ? selectedCustomer.loyaltyPoints : undefined}
                  placeholder="Enter points amount"
                />
                {loyaltyForm.points && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    ≈ {formatCurrency(parseInt(loyaltyForm.points || '0') * 100)}
                  </div>
                )}
              </div>

              {loyaltyForm.action === 'add' && (
                <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                  <label className="form-label">Transaction Amount (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={loyaltyForm.amount}
                    onChange={(e) => setLoyaltyForm({ ...loyaltyForm, amount: e.target.value })}
                    placeholder="Enter transaction amount"
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={loyaltyForm.description}
                  onChange={(e) => setLoyaltyForm({ ...loyaltyForm, description: e.target.value })}
                  placeholder={loyaltyForm.action === 'add' ? 'e.g. Purchase reward, Birthday bonus' : 'e.g. Redeemed for discount'}
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

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
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ 
                    flex: 1,
                    background: loyaltyForm.action === 'add' ? 'var(--success)' : 'var(--warning)'
                  }}
                  disabled={saving}
                >
                  {saving ? 'Processing...' : (loyaltyForm.action === 'add' ? 'Add Points' : 'Redeem Points')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {modalType === 'purchaseHistory' && selectedCustomer && (
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
            width: '800px', 
            padding: 'var(--space-xl)', 
            background: '#111827',
            margin: 'var(--space-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Purchase History - {selectedCustomer.name}</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {purchaseHistory.length === 0 ? (
                <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <History size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
                  <p>No purchase history found.</p>
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: 0 }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1.5fr 1fr 1fr 1fr', 
                    gap: 'var(--space-md)', 
                    padding: 'var(--space-sm) var(--space-md)', 
                    borderBottom: '1px solid var(--border-subtle)', 
                    color: 'var(--text-tertiary)', 
                    fontSize: '0.8rem', 
                    fontWeight: 600, 
                    textTransform: 'uppercase' 
                  }}>
                    <div>Transaction</div>
                    <div>Date</div>
                    <div>Items</div>
                    <div>Total</div>
                  </div>
                  {purchaseHistory.map((transaction: any) => (
                    <div 
                      key={transaction.id} 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1.5fr 1fr 1fr 1fr', 
                        gap: 'var(--space-md)', 
                        padding: 'var(--space-md)', 
                        borderBottom: '1px solid var(--border-subtle)', 
                        alignItems: 'center' 
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{transaction.transactionNumber}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                          {transaction.paymentMethod}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.9rem' }}>{formatDate(transaction.createdAt)}</div>
                      <div style={{ fontSize: '0.9rem' }}>{transaction.items?.length || 0} items</div>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                        {formatCurrency(Number(transaction.total))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button className="btn btn-outline" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Loyalty History Modal */}
      {modalType === 'loyaltyHistory' && selectedCustomer && (
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
            width: '800px', 
            padding: 'var(--space-xl)', 
            background: '#111827',
            margin: 'var(--space-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Loyalty Points History - {selectedCustomer.name}</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {loyaltyHistory.length === 0 ? (
                <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <Gift size={48} style={{ marginBottom: 'var(--space-md)', opacity: 0.5 }} />
                  <p>No loyalty point transactions found.</p>
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: 0 }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 2fr 1.5fr', 
                    gap: 'var(--space-md)', 
                    padding: 'var(--space-sm) var(--space-md)', 
                    borderBottom: '1px solid var(--border-subtle)', 
                    color: 'var(--text-tertiary)', 
                    fontSize: '0.8rem', 
                    fontWeight: 600, 
                    textTransform: 'uppercase' 
                  }}>
                    <div>Type</div>
                    <div>Points</div>
                    <div>Description</div>
                    <div>Date</div>
                  </div>
                  {loyaltyHistory.map((transaction: any) => (
                    <div 
                      key={transaction.id} 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr 2fr 1.5fr', 
                        gap: 'var(--space-md)', 
                        padding: 'var(--space-md)', 
                        borderBottom: '1px solid var(--border-subtle)', 
                        alignItems: 'center' 
                      }}
                    >
                      <div>
                        <span 
                          className="badge" 
                          style={{ 
                            background: transaction.type === 'earn' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                            color: transaction.type === 'earn' ? 'var(--success)' : 'var(--warning)'
                          }}
                        >
                          {transaction.type === 'earn' ? 'Earned' : 'Redeemed'}
                        </span>
                      </div>
                      <div style={{ 
                        fontWeight: 600, 
                        color: transaction.type === 'earn' ? 'var(--success)' : 'var(--warning)' 
                      }}>
                        {transaction.type === 'earn' ? '+' : '-'}{transaction.points}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {transaction.description || '-'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                        {formatDate(transaction.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button className="btn btn-outline" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalType === 'delete' && selectedCustomer && (
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
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-md)', color: 'var(--danger)' }}>
              Delete Customer
            </h2>
            <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
              Are you sure you want to delete <strong>{selectedCustomer.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1 }} 
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, background: 'var(--danger)' }}
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Delete Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
