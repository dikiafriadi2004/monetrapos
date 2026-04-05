"use client";

import { useState, useEffect } from 'react';
import { PackageSearch, Plus, Edit, Trash2, Search, ToggleLeft, ToggleRight, X, Zap, Star, Code } from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../components/ConfirmModal';

interface Feature {
  id: string;
  name: string;
  code: string;
  description: string;
  icon?: string;
  isActive: boolean;
  plans?: { id: string; name: string }[];
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', icon: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; feature: Feature | null }>({ open: false, feature: null });
  const [deleting, setDeleting] = useState(false);

  const fetchFeatures = async () => {
    try {
      const data: any = await api.get('/features');
      setFeatures(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeatures(); }, []);

  const openNewModal = () => {
    setEditingFeature(null);
    setForm({ name: '', code: '', description: '', icon: '' });
    setModalOpen(true);
  };

  const openEditModal = (f: Feature) => {
    setEditingFeature(f);
    setForm({ name: f.name, code: f.code, description: f.description || '', icon: f.icon || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) return;
    setSubmitting(true);
    try {
      if (editingFeature) {
        await api.patch(`/features/${editingFeature.id}`, form);
      } else {
        await api.post('/features', { ...form, isActive: true });
      }
      await fetchFeatures();
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save feature');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.feature) return;
    setDeleting(true);
    try {
      await api.delete(`/features/${deleteConfirm.feature.id}`);
      setFeatures(prev => prev.filter(f => f.id !== deleteConfirm.feature!.id));
      toast.success('Feature deleted');
      setDeleteConfirm({ open: false, feature: null });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete feature');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (feature: Feature) => {
    try {
      await api.patch(`/features/${feature.id}`, { isActive: !feature.isActive });
      setFeatures(prev => prev.map(f => f.id === feature.id ? { ...f, isActive: !f.isActive } : f));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update feature');
    }
  };

  const autoGenerateCode = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  };

  const filtered = features.filter(f =>
    !searchQuery ||
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const iconOptions = [
    { value: 'qris', label: 'QRIS Payment', icon: '💳' },
    { value: 'kitchen', label: 'Kitchen Display', icon: '🍳' },
    { value: 'loyalty', label: 'Loyalty Program', icon: '⭐' },
    { value: 'multi_outlet', label: 'Multi-Outlet', icon: '🏪' },
    { value: 'whatsapp', label: 'WhatsApp Receipt', icon: '📱' },
    { value: 'inventory', label: 'Inventory Alert', icon: '📦' },
    { value: 'barcode', label: 'Barcode Scanner', icon: '📊' },
    { value: 'report', label: 'Advanced Reports', icon: '📈' },
    { value: 'api', label: 'API Access', icon: '🔌' },
    { value: 'offline', label: 'Offline Mode', icon: '📡' },
  ];

  const getIconEmoji = (iconCode: string | undefined) => {
    return iconOptions.find(o => o.value === iconCode)?.icon || '✨';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Feature Marketplace</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Define and manage features available for subscription plans.</p>
        </div>
        <button onClick={openNewModal} className="btn btn-primary">
          <Plus size={18} /> Add Feature
        </button>
      </div>

      {/* Stats */}
      <div className="grid-cols-3" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="glass-panel" style={{ padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
            <PackageSearch size={18} />
          </div>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '2px' }}>{features.length}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Total Features</p>
        </div>
        <div className="glass-panel" style={{ padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
            <Zap size={18} />
          </div>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '2px' }}>{features.filter(f => f.isActive).length}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Active Features</p>
        </div>
        <div className="glass-panel" style={{ padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
            <Star size={18} />
          </div>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '2px' }}>{features.filter(f => f.plans && f.plans.length > 0).length}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Bundled in Plans</p>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="glass-panel" style={{ padding: 0 }}>
        {/* Toolbar */}
        <div className="flex-between" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search features..."
              className="form-input"
              style={{ paddingLeft: '36px', height: '36px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{filtered.length} features</span>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading features...</div>
        ) : filtered.length === 0 ? (
          <div className="flex-center" style={{ height: '300px', flexDirection: 'column' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
              <PackageSearch size={32} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>
              {searchQuery ? 'No features match your search' : 'No features defined'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center', margin: '0 auto var(--space-lg)' }}>
              {searchQuery
                ? 'Try adjusting your search terms.'
                : 'Get started by defining features like "Kitchen Display", "QRIS Payment", or "Loyalty Program" to bundle into subscription plans.'}
            </p>
            {!searchQuery && <button onClick={openNewModal} className="btn btn-outline">Create First Feature</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)', padding: 'var(--space-lg)' }}>
            {filtered.map(feature => (
              <div key={feature.id} className="animate-fade-in" style={{
                background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                padding: 'var(--space-lg)', border: '1px solid var(--border-subtle)',
                transition: 'all var(--transition-normal)', position: 'relative', overflow: 'hidden',
                opacity: feature.isActive ? 1 : 0.6
              }}>
                {/* Header */}
                <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ fontSize: '1.5rem' }}>{getIconEmoji(feature.icon)}</span>
                    <div>
                      <h4 style={{ fontSize: '1rem', marginBottom: '2px' }}>{feature.name}</h4>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--accent-base)', background: 'var(--accent-light)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                        {feature.code}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleToggle(feature)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: feature.isActive ? 'var(--success)' : 'var(--text-tertiary)' }}>
                    {feature.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', minHeight: '40px', lineHeight: 1.5 }}>
                  {feature.description || 'No description provided.'}
                </p>

                {/* Plans bundled */}
                {feature.plans && feature.plans.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--space-md)' }}>
                    {feature.plans.map(plan => (
                      <span key={plan.id} className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{plan.name}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-md)' }}>
                  <button onClick={() => openEditModal(feature)} className="btn btn-outline" style={{ flex: 1, height: '34px', fontSize: '0.8rem' }}>
                    <Edit size={14} /> Edit
                  </button>
                  <button onClick={() => setDeleteConfirm({ open: true, feature })} className="btn btn-outline" style={{ height: '34px', padding: '0 12px', color: 'var(--danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: '520px', maxWidth: '90vw', padding: 'var(--space-xl)', zIndex: 9001 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: '1.25rem' }}>{editingFeature ? 'Edit Feature' : 'New Feature'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">Feature Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Kitchen Display System"
                value={form.name}
                onChange={e => {
                  const name = e.target.value;
                  setForm(p => ({ ...p, name, code: editingFeature ? p.code : autoGenerateCode(name) }));
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Feature Code *</label>
              <div style={{ position: 'relative' }}>
                <Code size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '34px', fontFamily: 'monospace' }}
                  placeholder="kitchen_display"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Unique identifier for this feature (lowercase, underscores only)</span>
            </div>

            <div className="form-group">
              <label className="form-label">Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {iconOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, icon: opt.value }))}
                    style={{
                      padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid',
                      borderColor: form.icon === opt.value ? 'var(--accent-base)' : 'var(--border-subtle)',
                      background: form.icon === opt.value ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                      cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px',
                      color: form.icon === opt.value ? 'var(--accent-base)' : 'var(--text-secondary)'
                    }}
                    title={opt.label}
                  >
                    <span>{opt.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Describe what this feature does and the value it provides to members..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setModalOpen(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={submitting || !form.name || !form.code}>
                {submitting ? 'Saving...' : editingFeature ? 'Update Feature' : 'Create Feature'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteConfirm.open}
        title="Hapus Feature"
        description={`Hapus feature "${deleteConfirm.feature?.name}"? Member yang menggunakan feature ini mungkin kehilangan akses.`}
        confirmLabel="Hapus Feature"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm({ open: false, feature: null })}
      />
    </div>
  );
}
