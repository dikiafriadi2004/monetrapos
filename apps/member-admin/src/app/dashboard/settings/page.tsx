"use client";

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { api } from '../../../lib/api';
import { TaxesTab } from './components/TaxesTab';
import { DiscountsTab } from './components/DiscountsTab';
import { PaymentsTab } from './components/PaymentsTab';
import { StoresTab } from './components/StoresTab';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'taxes' | 'discounts' | 'payments' | 'stores'>('taxes');
  
  const [taxes, setTaxes] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taxRes, discRes, payRes, storeRes]: any = await Promise.all([
        api.get('/taxes'),
        api.get('/discounts'),
        api.get('/payments'), // Note: In a real system these endpoints need to handle store-scoping strictly
        api.get('/stores')
      ]);
      setTaxes(taxRes);
      setDiscounts(discRes);
      setPayments(payRes);
      setStores(storeRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Tax Handlers
  const handleSaveTax = async (data: any) => {
    if (data.id) await api.patch(`/taxes/${data.id}`, data);
    else await api.post('/taxes', data);
    await fetchData();
  };
  const handleDeleteTax = async (id: string) => {
    await api.delete(`/taxes/${id}`);
    setTaxes(prev => prev.filter(t => t.id !== id));
  };

  // Discount Handlers
  const handleSaveDiscount = async (data: any) => {
    if (data.id) await api.patch(`/discounts/${data.id}`, data);
    else await api.post('/discounts', data);
    await fetchData();
  };
  const handleDeleteDiscount = async (id: string) => {
    await api.delete(`/discounts/${id}`);
    setDiscounts(prev => prev.filter(d => d.id !== id));
  };

  const handleSavePayment = async (data: any) => {
    if (data.id) await api.patch(`/payments/${data.id}`, data);
    else await api.post('/payments', data);
    await fetchData();
  }

  // Store Handlers
  const handleSaveStore = async (data: any) => {
    if (data.id) await api.patch(`/stores/${data.id}`, data); // Note: stores controller uses PATCH
    else await api.post('/stores', data);
    await fetchData();
  }
  const handleDeleteStore = async (id: string) => {
    await api.delete(`/stores/${id}`);
    setStores(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Store Preferences</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure global financial constants for your POS application.</p>
        </div>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SettingsIcon size={20} color="var(--text-secondary)" />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-xl)' }}>
        <button 
          onClick={() => setActiveTab('taxes')}
          style={{ 
            background: 'none', border: 'none', padding: 'var(--space-sm) 0', 
            fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            color: activeTab === 'taxes' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom: activeTab === 'taxes' ? '2px solid var(--success)' : '2px solid transparent'
          }}
        >
          Taxes Config
        </button>
        <button 
          onClick={() => setActiveTab('discounts')}
          style={{ 
            background: 'none', border: 'none', padding: 'var(--space-sm) 0', 
            fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            color: activeTab === 'discounts' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom: activeTab === 'discounts' ? '2px solid var(--warning)' : '2px solid transparent'
          }}
        >
          Discounts Profiles
        </button>
        <button 
          onClick={() => setActiveTab('payments')}
          style={{ 
            background: 'none', border: 'none', padding: 'var(--space-sm) 0', 
            fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            color: activeTab === 'payments' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom: activeTab === 'payments' ? '2px solid #38bdf8' : '2px solid transparent'
          }}
        >
          Payment Integrations
        </button>
        <button 
          onClick={() => setActiveTab('stores')}
          style={{ 
            background: 'none', border: 'none', padding: 'var(--space-sm) 0', 
            fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            color: activeTab === 'stores' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom: activeTab === 'stores' ? '2px solid #8b5cf6' : '2px solid transparent' // Purple accent
          }}
        >
          Outlets / Branches
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--space-xl)' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Fetching configurations...</div>
        ) : (
          <>
            {activeTab === 'taxes' && <TaxesTab taxes={taxes} onSave={handleSaveTax} onDelete={handleDeleteTax} />}
            {activeTab === 'discounts' && <DiscountsTab discounts={discounts} onSave={handleSaveDiscount} onDelete={handleDeleteDiscount} />}
            {activeTab === 'payments' && <PaymentsTab payments={payments} onSave={handleSavePayment} />}
            {activeTab === 'stores' && <StoresTab stores={stores} onSave={handleSaveStore} onDelete={handleDeleteStore} />}
          </>
        )}
      </div>

    </div>
  );
}
