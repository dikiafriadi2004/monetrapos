"use client";

import { useState } from 'react';
import { Plus, Edit, Trash2, Tag, Loader2, X } from 'lucide-react';
import { formatCurrency } from '../../../../lib/utils';
import toast from 'react-hot-toast';

export function DiscountsTab({ discounts, onSave, onDelete }: { discounts: any[], onSave: (d: any) => Promise<void>, onDelete: (i: string) => Promise<void> }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('');

  const openModal = (data?: any) => {
    setEditingData(data || null);
    setName(data?.name || '');
    setType(data?.type || 'percentage');
    setValue(data?.value || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        id: editingData?.id,
        name,
        type,
        value: Number(value),
        isActive: true
      });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save discount:', err);
      toast.error(err?.response?.data?.message || 'Failed to save discount');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Discounts & Vouchers</h2>
          <p style={{ color: 'var(--text-tertiary)' }}>Set up global store discounts or custom percentage cuts.</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary" style={{ background: 'var(--warning)', color: '#000' }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Add Discount
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
        {discounts.length === 0 && <p style={{ color: 'var(--text-tertiary)' }}>No discounts created yet.</p>}
        {discounts.map(disc => (
          <div key={disc.id} className="animate-fade-in" style={{ padding: 'var(--space-md)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--warning)' }} />
            <div className="flex-between" style={{ marginBottom: 'var(--space-md)', paddingLeft: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={16} color="var(--warning)" />
                <h4 style={{ margin: 0 }}>{disc.name}</h4>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => openModal(disc)} className="btn btn-outline" style={{ padding: '4px', border: 'none' }}><Edit size={14}/></button>
                <button onClick={() => onDelete(disc.id)} className="btn btn-outline" style={{ padding: '4px', border: 'none', color: 'var(--danger)' }}><Trash2 size={14}/></button>
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, paddingLeft: '12px', color: 'var(--warning)' }}>
              {disc.type === 'percentage' ? `${disc.value}% off` : formatCurrency(disc.value)}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 'var(--space-md)' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-xl)', position: 'relative' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: 'var(--space-lg)', right: 'var(--space-lg)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24}/></button>
            <h2 style={{ marginBottom: 'var(--space-xl)', fontSize: '1.25rem' }}>{editingData ? 'Edit Discount' : 'New Discount'}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Discount Identifier</label>
                <input required type="text" className="form-input" placeholder="e.g. Summer Sale 20%" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Discount Type</label>
                  <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (Rp)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Value</label>
                  <input required type="number" className="form-input" placeholder="20" value={value} onChange={e => setValue(e.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ background: 'var(--warning)', color: '#000', marginTop: 'var(--space-md)' }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save Discount'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
