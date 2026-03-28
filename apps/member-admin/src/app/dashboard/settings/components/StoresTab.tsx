import { useState } from 'react';
import { Store as StoreIcon, Plus, Edit, Trash2, MapPin, Phone } from 'lucide-react';

export function StoresTab({ stores, onSave, onDelete }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });

  const handleOpenForm = (store?: any) => {
    if (store) {
      setEditingStore(store);
      setFormData({ name: store.name, address: store.address || '', phone: store.phone || '' });
    } else {
      setEditingStore(null);
      setFormData({ name: '', address: '', phone: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: editingStore?.id });
    setIsModalOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Store Branches</h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Manage all your physical or regional outlets from one place.</p>
        </div>
        <button className="btn btn-outline" onClick={() => handleOpenForm()} style={{ color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> New Branch
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
        {stores.map((store: any) => (
          <div key={store.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <StoreIcon size={16} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{store.name}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <MapPin size={14} style={{ marginTop: '2px', color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span>{store.address || 'No address set'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <Phone size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span>{store.phone || '-'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-md)' }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '6px', fontSize: '0.85rem' }} onClick={() => handleOpenForm(store)}>
                <Edit size={14} style={{ marginRight: '6px' }} /> Edit
              </button>
              <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => onDelete(store.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {stores.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-tertiary)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <StoreIcon size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div>No store branches created yet.</div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '400px', padding: 'var(--space-xl)', background: '#111827' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>{editingStore ? 'Edit Branch' : 'New Branch'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Branch Name</label>
                <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required autoFocus />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Phone Number</label>
                <input type="text" className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">Address</label>
                <textarea className="form-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#8b5cf6' }}>Save Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
