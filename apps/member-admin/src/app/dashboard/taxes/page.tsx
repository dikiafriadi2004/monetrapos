"use client";

import { useState, useEffect } from 'react';
import { Percent, Tag, Plus, Edit, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { api } from '../../../lib/api';

interface Tax {
  id: string;
  name: string;
  rate: number;
  type: string;
  isActive: boolean;
}

interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder?: number;
  code?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export default function TaxesDiscountsPage() {
  const [activeTab, setActiveTab] = useState<'taxes' | 'discounts'>('taxes');
  
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);

  // Tax modal
  const [isTaxModalOpen, setTaxModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [taxForm, setTaxForm] = useState({ name: '', rate: '', type: 'percentage' });

  // Discount modal
  const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [discountForm, setDiscountForm] = useState({ name: '', type: 'percentage', value: '', code: '', minOrder: '' });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [taxData, discountData]: any = await Promise.all([
        api.get('/taxes'),
        api.get('/discounts')
      ]);
      setTaxes(Array.isArray(taxData) ? taxData : []);
      setDiscounts(Array.isArray(discountData) ? discountData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Tax handlers
  const openNewTax = () => { setEditingTax(null); setTaxForm({ name: '', rate: '', type: 'percentage' }); setTaxModalOpen(true); };
  const openEditTax = (tax: Tax) => { setEditingTax(tax); setTaxForm({ name: tax.name, rate: String(tax.rate), type: tax.type || 'percentage' }); setTaxModalOpen(true); };

  const handleSaveTax = async () => {
    if (!taxForm.name || !taxForm.rate) return;
    setSubmitting(true);
    try {
      const payload = { name: taxForm.name, rate: parseFloat(taxForm.rate), type: taxForm.type, isActive: true };
      if (editingTax) await api.patch(`/taxes/${editingTax.id}`, payload);
      else await api.post('/taxes', payload);
      await fetchData();
      setTaxModalOpen(false);
    } catch (err) { alert('Failed to save tax'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteTax = async (id: string) => {
    if (!confirm('Delete this tax configuration?')) return;
    try { await api.delete(`/taxes/${id}`); setTaxes(prev => prev.filter(t => t.id !== id)); }
    catch { alert('Failed to delete tax'); }
  };

  const handleToggleTax = async (tax: Tax) => {
    try { await api.patch(`/taxes/${tax.id}`, { isActive: !tax.isActive }); setTaxes(prev => prev.map(t => t.id === tax.id ? { ...t, isActive: !t.isActive } : t)); }
    catch { alert('Failed to update tax'); }
  };

  // Discount handlers
  const openNewDiscount = () => { setEditingDiscount(null); setDiscountForm({ name: '', type: 'percentage', value: '', code: '', minOrder: '' }); setDiscountModalOpen(true); };
  const openEditDiscount = (d: Discount) => { setEditingDiscount(d); setDiscountForm({ name: d.name, type: d.type, value: String(d.value), code: d.code || '', minOrder: d.minOrder ? String(d.minOrder) : '' }); setDiscountModalOpen(true); };

  const handleSaveDiscount = async () => {
    if (!discountForm.name || !discountForm.value) return;
    setSubmitting(true);
    try {
      const payload = { name: discountForm.name, type: discountForm.type, value: parseFloat(discountForm.value), code: discountForm.code || undefined, minOrder: discountForm.minOrder ? parseFloat(discountForm.minOrder) : undefined, isActive: true };
      if (editingDiscount) await api.patch(`/discounts/${editingDiscount.id}`, payload);
      else await api.post('/discounts', payload);
      await fetchData();
      setDiscountModalOpen(false);
    } catch (err) { alert('Failed to save discount'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!confirm('Delete this discount?')) return;
    try { await api.delete(`/discounts/${id}`); setDiscounts(prev => prev.filter(d => d.id !== id)); }
    catch { alert('Failed to delete discount'); }
  };

  const handleToggleDiscount = async (d: Discount) => {
    try { await api.patch(`/discounts/${d.id}`, { isActive: !d.isActive }); setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, isActive: !x.isActive } : x)); }
    catch { alert('Failed to update discount'); }
  };

  const tabStyle = (tab: string) => ({
    background: 'none', border: 'none', padding: 'var(--space-sm) 0',
    fontSize: '1rem', fontWeight: 600 as const, cursor: 'pointer' as const,
    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
    borderBottom: activeTab === tab ? '2px solid var(--success)' : '2px solid transparent'
  });

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Taxes & Discounts</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure tax rates and discount offers for your store.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button onClick={openNewTax} className="btn btn-outline">
            <Percent size={16} /> New Tax
          </button>
          <button onClick={openNewDiscount} className="btn btn-primary" style={{ background: 'var(--success)' }}>
            <Tag size={16} /> New Discount
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-xl)' }}>
        <button onClick={() => setActiveTab('taxes')} style={tabStyle('taxes')}>
          Tax Rates ({taxes.length})
        </button>
        <button onClick={() => setActiveTab('discounts')} style={tabStyle('discounts')}>
          Discounts ({discounts.length})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading data...</div>
      ) : (
        <div className="glass-panel" style={{ padding: 0 }}>
          {/* TAXES TAB */}
          {activeTab === 'taxes' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div style={{ flex: 2 }}>Tax Name</div>
                <div style={{ flex: 1 }}>Rate</div>
                <div style={{ flex: 1 }}>Type</div>
                <div style={{ flex: 0.8 }}>Status</div>
                <div style={{ width: '100px' }}>Actions</div>
              </div>

              {taxes.length === 0 ? (
                <div className="flex-center" style={{ height: '200px', flexDirection: 'column' }}>
                  <Percent size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }} />
                  <p style={{ color: 'var(--text-tertiary)' }}>No tax rates configured</p>
                  <button onClick={openNewTax} className="btn btn-outline" style={{ marginTop: 'var(--space-md)' }}>Add First Tax</button>
                </div>
              ) : taxes.map(tax => (
                <div key={tax.id} className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ flex: 2, fontWeight: 500 }}>{tax.name}</div>
                  <div style={{ flex: 1, fontWeight: 600, color: 'var(--warning)' }}>{tax.rate}%</div>
                  <div style={{ flex: 1 }}>
                    <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{tax.type || 'Percentage'}</span>
                  </div>
                  <div style={{ flex: 0.8 }}>
                    <button onClick={() => handleToggleTax(tax)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tax.isActive ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      {tax.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                  <div style={{ display: 'flex', width: '100px', gap: '6px' }}>
                    <button onClick={() => openEditTax(tax)} className="btn btn-outline" style={{ padding: '6px' }}><Edit size={14} /></button>
                    <button onClick={() => handleDeleteTax(tax.id)} className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DISCOUNTS TAB */}
          {activeTab === 'discounts' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div style={{ flex: 2 }}>Discount Name</div>
                <div style={{ flex: 1 }}>Value</div>
                <div style={{ flex: 1 }}>Code</div>
                <div style={{ flex: 0.8 }}>Status</div>
                <div style={{ width: '100px' }}>Actions</div>
              </div>

              {discounts.length === 0 ? (
                <div className="flex-center" style={{ height: '200px', flexDirection: 'column' }}>
                  <Tag size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }} />
                  <p style={{ color: 'var(--text-tertiary)' }}>No discounts configured</p>
                  <button onClick={openNewDiscount} className="btn btn-outline" style={{ marginTop: 'var(--space-md)' }}>Create First Discount</button>
                </div>
              ) : discounts.map(d => (
                <div key={d.id} className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ flex: 2, fontWeight: 500 }}>{d.name}</div>
                  <div style={{ flex: 1, fontWeight: 600, color: 'var(--success)' }}>
                    {d.type === 'percentage' ? `${d.value}%` : `Rp ${(d.value || 0).toLocaleString('id-ID')}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    {d.code ? <span style={{ fontFamily: 'monospace', color: 'var(--accent-base)', fontWeight: 600 }}>{d.code}</span> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </div>
                  <div style={{ flex: 0.8 }}>
                    <button onClick={() => handleToggleDiscount(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: d.isActive ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      {d.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                  <div style={{ display: 'flex', width: '100px', gap: '6px' }}>
                    <button onClick={() => openEditDiscount(d)} className="btn btn-outline" style={{ padding: '6px' }}><Edit size={14} /></button>
                    <button onClick={() => handleDeleteDiscount(d.id)} className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tax Modal */}
      {isTaxModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setTaxModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: '450px', maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: '1.25rem' }}>{editingTax ? 'Edit Tax' : 'New Tax Rate'}</h3>
              <button onClick={() => setTaxModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Tax Name *</label>
              <input className="form-input" placeholder="e.g. PPN, PB1" value={taxForm.name} onChange={e => setTaxForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Rate (%) *</label>
              <input className="form-input" type="number" step="0.1" placeholder="11" value={taxForm.rate} onChange={e => setTaxForm(p => ({ ...p, rate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input" value={taxForm.type} onChange={e => setTaxForm(p => ({ ...p, type: e.target.value }))}>
                <option value="percentage">Percentage</option>
                <option value="inclusive">Inclusive</option>
                <option value="exclusive">Exclusive</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setTaxModalOpen(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleSaveTax} className="btn btn-primary" disabled={submitting || !taxForm.name || !taxForm.rate}>
                {submitting ? 'Saving...' : editingTax ? 'Update Tax' : 'Create Tax'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {isDiscountModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setDiscountModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: '500px', maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: '1.25rem' }}>{editingDiscount ? 'Edit Discount' : 'New Discount'}</h3>
              <button onClick={() => setDiscountModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Discount Name *</label>
              <input className="form-input" placeholder="e.g. Happy Hour, Member Discount" value={discountForm.name} onChange={e => setDiscountForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={discountForm.type} onChange={e => setDiscountForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (Rp)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Value *</label>
                <input className="form-input" type="number" placeholder={discountForm.type === 'percentage' ? '10' : '5000'} value={discountForm.value} onChange={e => setDiscountForm(p => ({ ...p, value: e.target.value }))} />
              </div>
            </div>
            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Voucher Code</label>
                <input className="form-input" placeholder="SAVE10" value={discountForm.code} onChange={e => setDiscountForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Min. Order (Rp)</label>
                <input className="form-input" type="number" placeholder="50000" value={discountForm.minOrder} onChange={e => setDiscountForm(p => ({ ...p, minOrder: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setDiscountModalOpen(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleSaveDiscount} className="btn btn-primary" style={{ background: 'var(--success)' }} disabled={submitting || !discountForm.name || !discountForm.value}>
                {submitting ? 'Saving...' : editingDiscount ? 'Update Discount' : 'Create Discount'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
