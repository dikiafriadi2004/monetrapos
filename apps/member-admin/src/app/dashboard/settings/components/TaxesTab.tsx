"use client";

import { useState } from 'react';
import { Plus, Edit, Trash2, Percent, Loader2, X } from 'lucide-react';

export function TaxesTab({ taxes, onSave, onDelete }: { taxes: any[], onSave: (d: any) => Promise<void>, onDelete: (i: string) => Promise<void> }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [type, setType] = useState('percentage');

  const openModal = (data?: any) => {
    setEditingData(data || null);
    setName(data?.name || '');
    setRate(data?.rate || '');
    setType(data?.type || 'percentage');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        id: editingData?.id,
        name,
        rate: Number(rate),
        type
      });
      setIsModalOpen(false);
    } catch {
      alert("Failed to save tax");
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Tax Rates</h2>
          <p style={{ color: 'var(--text-tertiary)' }}>Configure standard tax inclusions like PB1 or PPN.</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary" style={{ background: 'var(--success)' }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Add Tax
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
        {taxes.length === 0 && <p style={{ color: 'var(--text-tertiary)' }}>No custom taxes configured.</p>}
        {taxes.map(tax => (
          <div key={tax.id} className="animate-fade-in" style={{ padding: 'var(--space-md)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '6px', borderRadius: '4px', color: 'var(--success)' }}>
                  <Percent size={16} />
                </div>
                <h4 style={{ margin: 0 }}>{tax.name}</h4>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => openModal(tax)} className="btn btn-outline" style={{ padding: '4px', border: 'none' }}><Edit size={14}/></button>
                <button onClick={() => onDelete(tax.id)} className="btn btn-outline" style={{ padding: '4px', border: 'none', color: 'var(--danger)' }}><Trash2 size={14}/></button>
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{tax.rate}{tax.type === 'percentage' ? '%' : ' IDR'}</div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 'var(--space-md)' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-xl)', position: 'relative' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: 'var(--space-lg)', right: 'var(--space-lg)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24}/></button>
            <h2 style={{ marginBottom: 'var(--space-xl)', fontSize: '1.25rem' }}>{editingData ? 'Edit Tax' : 'New Tax Rule'}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Tax Name</label>
                <input required type="text" className="form-input" placeholder="e.g. PPN" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Type</label>
                  <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Rate</label>
                  <input required type="number" step="0.01" className="form-input" placeholder="11" value={rate} onChange={e => setRate(e.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ background: 'var(--success)', marginTop: 'var(--space-md)' }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save Tax'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
