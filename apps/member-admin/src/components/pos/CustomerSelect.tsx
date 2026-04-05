'use client';

import { useState, useEffect } from 'react';
import { Search, User, X, Star } from 'lucide-react';
import { Customer } from '@/types';
import { customerService } from '@/services/customer.service';

interface CustomerSelectProps {
  storeId: string;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export default function CustomerSelect({ storeId, selectedCustomer, onSelectCustomer }: CustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (isOpen) loadCustomers(); }, [isOpen, storeId]);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredCustomers(q
      ? customers.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q))
      : customers
    );
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await customerService.getCustomers(storeId);
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally { setLoading(false); }
  };

  return (
    <div>
      {selectedCustomer ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, background: 'var(--accent-base)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} style={{ color: 'white' }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedCustomer.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={12} style={{ color: 'var(--warning)' }} />
                {selectedCustomer.loyaltyPoints} pts
                {selectedCustomer.phone && ` • ${selectedCustomer.phone}`}
              </div>
            </div>
          </div>
          <button onClick={() => onSelectCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} style={{
          width: '100%', padding: 12, border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)',
          background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          color: 'var(--text-secondary)', transition: 'all var(--transition-fast)',
        }}>
          <User size={18} />
          <span style={{ fontSize: '0.875rem' }}>Select Customer (Optional)</span>
        </button>
      )}

      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: 560, margin: 16, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-lg)', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Select Customer</h3>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={22} /></button>
            </div>
            <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by name, phone, or email..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-tertiary)' }}>Loading...</div>
              ) : filteredCustomers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-tertiary)' }}>
                  {searchQuery ? 'No customers found' : 'No customers yet'}
                </div>
              ) : filteredCustomers.map(customer => (
                <button key={customer.id} onClick={() => { onSelectCustomer(customer); setIsOpen(false); setSearchQuery(''); }}
                  style={{ width: '100%', padding: 12, textAlign: 'left', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{customer.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {customer.phone}{customer.email && ` • ${customer.email}`}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-base)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={12} style={{ color: 'var(--warning)' }} />
                    {customer.loyaltyPoints} pts
                  </div>
                </button>
              ))}
            </div>
            <div style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setIsOpen(false)} className="btn btn-outline" style={{ width: '100%' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
