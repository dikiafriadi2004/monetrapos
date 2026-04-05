'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, X, Shirt, Clock } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

interface ServiceType {
  id: string;
  name: string;
  service_type: string;
  description?: string;
  pricing_type: 'per_kg' | 'per_item';
  price: number;
  estimated_hours: number;
  is_active: boolean;
}

const SERVICE_TYPES = ['wash_dry', 'wash_iron', 'dry_clean', 'iron_only'];
const SERVICE_LABELS: Record<string, string> = {
  wash_dry: 'Wash & Dry', wash_iron: 'Wash & Iron',
  dry_clean: 'Dry Clean', iron_only: 'Iron Only',
};

const emptyForm = {
  name: '', service_type: 'wash_dry', description: '',
  pricing_type: 'per_kg' as 'per_kg' | 'per_item', price: 0, estimated_hours: 24,
};

export default function LaundryServiceTypesPage() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing: ServiceType | null }>({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/laundry/service-types');
      const data = res?.data || res;
      setServices(Array.isArray(data) ? data : (data?.data || []));
    } catch { toast.error('Failed to load service types'); }
    finally { setLoading(false); }
  };

  const openModal = (s?: ServiceType) => {
    setForm(s ? { name: s.name, service_type: s.service_type, description: s.description || '', pricing_type: s.pricing_type, price: s.price, estimated_hours: s.estimated_hours } : emptyForm);
    setModal({ open: true, editing: s || null });
  };

  const save = async () => {
    if (!form.name || !form.price) { toast.error('Name and price are required'); return; }
    setSaving(true);
    try {
      if (modal.editing) {
        await apiClient.patch(`/laundry/service-types/${modal.editing.id}`, form);
        toast.success('Service type updated');
      } else {
        await apiClient.post('/laundry/service-types', form);
        toast.success('Service type created');
      }
      await load();
      setModal({ open: false, editing: null });
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await apiClient.delete(`/laundry/service-types/${id}`);
      toast.success('Deleted');
      await load();
    } catch { toast.error('Failed to delete'); }
  };

  const formatPrice = (p: number, type: string) =>
    `Rp ${Number(p).toLocaleString('id-ID')} / ${type === 'per_kg' ? 'kg' : 'item'}`;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Service Types</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure laundry service types and pricing</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary">
          <Plus size={16} /> New Service Type
        </button>
      </div>

      {services.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <Shirt size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>No service types yet. Create one to start accepting laundry orders.</p>
          <button onClick={() => openModal()} className="btn btn-primary"><Plus size={16} /> Create Service Type</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
          {services.map(s => (
            <div key={s.id} className="glass-panel animate-fade-in" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>{s.name}</h3>
                  <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: '0.75rem', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', fontWeight: 500 }}>
                    {SERVICE_LABELS[s.service_type] || s.service_type}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openModal(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><Edit2 size={16} /></button>
                  <button onClick={() => remove(s.id, s.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                </div>
              </div>
              {s.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>{s.description}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>{formatPrice(s.price, s.pricing_type)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Price</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Clock size={14} /> {s.estimated_hours}h
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Est. Time</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModal({ open: false, editing: null })} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 480, maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{modal.editing ? 'Edit Service Type' : 'New Service Type'}</h3>
              <button onClick={() => setModal({ open: false, editing: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Regular Wash & Dry" />
              </div>
              <div className="form-group">
                <label className="form-label">Service Type</label>
                <select className="form-input" value={form.service_type} onChange={e => setForm(p => ({ ...p, service_type: e.target.value }))}>
                  {SERVICE_TYPES.map(t => <option key={t} value={t}>{SERVICE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Pricing Type</label>
                <select className="form-input" value={form.pricing_type} onChange={e => setForm(p => ({ ...p, pricing_type: e.target.value as any }))}>
                  <option value="per_kg">Per Kilogram</option>
                  <option value="per_item">Per Item</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Price (IDR) *</label>
                <input type="number" className="form-input" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Est. Hours</label>
                <input type="number" className="form-input" value={form.estimated_hours} onChange={e => setForm(p => ({ ...p, estimated_hours: Number(e.target.value) }))} min="1" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setModal({ open: false, editing: null })} className="btn btn-outline">Cancel</button>
              <button onClick={save} className="btn btn-primary" disabled={saving || !form.name || !form.price}>
                {saving ? 'Saving...' : modal.editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
