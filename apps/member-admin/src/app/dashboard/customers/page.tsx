"use client";

import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit, Trash2, Award, Calendar, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    loyaltyPoints: 0
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data: any = await api.get('/customers');
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer?: any) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        loyaltyPoints: customer.loyaltyPoints || 0
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', loyaltyPoints: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCustomer) {
        await api.patch(`/customers/${editingCustomer.id}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await api.delete(`/customers/${id}`);
        fetchCustomers();
      } catch (err: any) {
        alert(err.message || 'Failed to delete customer');
      }
    }
  };

  const filteredData = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone?.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Customer CRM</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your loyal shoppers and their rewards points.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ background: 'var(--success)' }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Add Customer
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Toolbar */}
        <div className="flex-between" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by name, phone, email..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', height: '36px', background: 'rgba(255,255,255,0.03)' }}
            />
          </div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
            Showing {filteredData.length} records
          </div>
        </div>

        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 100px', gap: 'var(--space-md)', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
          <div>Customer Profile</div>
          <div>Contact Info</div>
          <div>Joined Date</div>
          <div>Loyalty Points</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {/* Table Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading customers...</div>
          ) : filteredData.length === 0 ? (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>No customers found matching your criteria.</div>
          ) : (
            filteredData.map(customer => (
              <div key={customer.id} className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 100px', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
                    {customer.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{customer.name}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{customer.phone || '-'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{customer.email || '-'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={14} color="var(--text-tertiary)" />
                  {new Date(customer.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <div className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={14} /> {customer.loyaltyPoints.toLocaleString()} PTS
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => handleOpenModal(customer)} className="btn btn-outline" style={{ padding: '6px', background: 'transparent' }}><Edit size={14}/></button>
                  <button onClick={() => handleDelete(customer.id, customer.name)} className="btn btn-outline" style={{ padding: '6px', background: 'transparent', color: 'var(--danger)' }}><Trash2 size={14}/></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '450px', padding: 'var(--space-xl)', background: '#111827' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="var(--success)" /> 
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            
            <form onSubmit={handleSave}>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Phone Number (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="+62 8..."
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Email Address (Optional)</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="customer@email.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              {editingCustomer && (
                <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                  <label className="form-label">Adjust Loyalty Points</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formData.loyaltyPoints}
                    onChange={e => setFormData({...formData, loyaltyPoints: parseInt(e.target.value) || 0})}
                  />
                  <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>Only adjust manually if necessary. Purchases auto-add points.</small>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: '32px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--success)' }} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}
