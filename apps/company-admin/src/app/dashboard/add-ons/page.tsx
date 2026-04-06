"use client";

import { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Search, ToggleLeft, ToggleRight, X, Tag, DollarSign, Zap, HeadphonesIcon, TrendingUp } from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../components/ConfirmModal';

interface AddOn {
  id: string;
  slug: string;
  name: string;
  description: string;
  long_description?: string;
  category: 'integration' | 'feature' | 'support' | 'capacity';
  pricing_type: 'one_time' | 'recurring';
  price: number;
  status: 'active' | 'inactive' | 'coming_soon';
  features?: string[];
  icon_url?: string;
}

const categoryIcons = {
  integration: Package,
  feature: Zap,
  support: HeadphonesIcon,
  capacity: TrendingUp,
};

const categoryColors = {
  integration: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  feature: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  support: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  capacity: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
};

const statusColors = {
  active: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  inactive: { bg: 'rgba(107,114,128,0.1)', color: '#6b7280' },
  coming_soon: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
};

const emptyForm = {
  slug: '', name: '', description: '', long_description: '',
  category: 'feature' as AddOn['category'],
  pricing_type: 'recurring' as AddOn['pricing_type'],
  price: 0, status: 'active' as AddOn['status'],
  features: [] as string[], icon_url: '',
};

export default function AddOnsManagementPage() {
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AddOn | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [featuresInput, setFeaturesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; addOn: AddOn | null }>({ open: false, addOn: null });
  const [deleting, setDeleting] = useState(false);

  const fetchAddOns = async () => {
    try {
      const data: any = await api.get('/admin/add-ons');
      setAddOns(Array.isArray(data) ? data : []);
    } catch {
      // fallback - try public endpoint
      try {
        const data: any = await api.get('/add-ons');
        setAddOns(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load add-ons:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAddOns(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFeaturesInput('');
    setModalOpen(true);
  };

  const openEdit = (a: AddOn) => {
    setEditing(a);
    setForm({
      slug: a.slug, name: a.name, description: a.description,
      long_description: a.long_description || '',
      category: a.category, pricing_type: a.pricing_type,
      price: a.price, status: a.status,
      features: a.features || [], icon_url: a.icon_url || '',
    });
    setFeaturesInput((a.features || []).join('\n'));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.price) return;
    setSubmitting(true);
    const payload = {
      ...form,
      features: featuresInput.split('\n').map(f => f.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        await api.patch(`/admin/add-ons/${editing.id}`, payload);
      } else {
        await api.post('/admin/add-ons', payload);
      }
      await fetchAddOns();
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save add-on');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.addOn) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/add-ons/${deleteConfirm.addOn.id}`);
      setAddOns(prev => prev.filter(a => a.id !== deleteConfirm.addOn!.id));
      toast.success('Add-on deleted');
      setDeleteConfirm({ open: false, addOn: null });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete add-on');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (addOn: AddOn) => {
    const newStatus = addOn.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/admin/add-ons/${addOn.id}`, { status: newStatus });
      setAddOns(prev => prev.map(a => a.id === addOn.id ? { ...a, status: newStatus } : a));
    } catch (err: any) { toast.error(err?.message || 'Failed to update status'); }
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const filtered = addOns.filter(a => {
    const matchSearch = !searchQuery ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'all' || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const stats = {
    total: addOns.length,
    active: addOns.filter(a => a.status === 'active').length,
    recurring: addOns.filter(a => a.pricing_type === 'recurring').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Add-ons Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage add-ons available for members to purchase.</p>
        </div>
        <button onClick={openNew} className="btn btn-primary">
          <Plus size={18} /> New Add-on
        </button>
      </div>

      {/* Stats */}
      <div className="grid-cols-3" style={{ marginBottom: 'var(--space-xl)' }}>
        {[
          { label: 'Total Add-ons', value: stats.total, icon: Package, color: 'var(--accent-base)' },
          { label: 'Active', value: stats.active, icon: Zap, color: 'var(--success)' },
          { label: 'Recurring', value: stats.recurring, icon: TrendingUp, color: 'var(--warning)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${color}20`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
              <Icon size={18} />
            </div>
            <h3 style={{ fontSize: '1.75rem', marginBottom: 2 }}>{value}</h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0 }}>
        {/* Toolbar */}
        <div className="flex-between" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input type="text" placeholder="Search add-ons..." className="form-input" style={{ paddingLeft: 36, height: 36, width: 240 }}
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select className="form-input" style={{ height: 36 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="integration">Integration</option>
              <option value="feature">Feature</option>
              <option value="support">Support</option>
              <option value="capacity">Capacity</option>
            </select>
          </div>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{filtered.length} add-ons</span>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
            <Package size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>No add-ons found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Add-on', 'Category', 'Pricing', 'Price', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-sm) var(--space-lg)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(addOn => {
                  const CatIcon = categoryIcons[addOn.category];
                  const catColor = categoryColors[addOn.category];
                  const statusColor = statusColors[addOn.status];
                  return (
                    <tr key={addOn.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <div style={{ fontWeight: 600 }}>{addOn.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{addOn.slug}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2, maxWidth: 300 }}>{addOn.description}</div>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 12, background: catColor.bg, color: catColor.color, fontSize: '0.8rem', fontWeight: 500 }}>
                          <CatIcon size={12} />
                          {addOn.category}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {addOn.pricing_type === 'recurring' ? '🔄 Monthly' : '💳 One-time'}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 600 }}>
                        {formatPrice(addOn.price)}
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 12, background: statusColor.bg, color: statusColor.color, fontSize: '0.8rem', fontWeight: 500 }}>
                          {addOn.status}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                          <button onClick={() => handleToggleStatus(addOn)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: addOn.status === 'active' ? 'var(--success)' : 'var(--text-tertiary)' }} title="Toggle status">
                            {addOn.status === 'active' ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          </button>
                          <button onClick={() => openEdit(addOn)} className="btn btn-outline" style={{ height: 32, padding: '0 10px', fontSize: '0.8rem' }}>
                            <Edit size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm({ open: true, addOn })} className="btn btn-outline" style={{ height: 32, padding: '0 10px', color: 'var(--danger)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 600, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 9001 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: '1.25rem' }}>{editing ? 'Edit Add-on' : 'New Add-on'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: editing ? p.slug : autoSlug(e.target.value) }))} placeholder="WhatsApp Integration" />
              </div>
              <div className="form-group">
                <label className="form-label">Slug *</label>
                <input className="form-input" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="whatsapp-integration" style={{ fontFamily: 'monospace' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Icon (emoji)</label>
                <input className="form-input" value={form.icon_url} onChange={e => setForm(p => ({ ...p, icon_url: e.target.value }))} placeholder="💬" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Short Description *</label>
                <input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Long Description</label>
                <textarea className="form-input" rows={3} value={form.long_description} onChange={e => setForm(p => ({ ...p, long_description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as any }))}>
                  <option value="integration">Integration</option>
                  <option value="feature">Feature</option>
                  <option value="support">Support</option>
                  <option value="capacity">Capacity</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Pricing Type</label>
                <select className="form-input" value={form.pricing_type} onChange={e => setForm(p => ({ ...p, pricing_type: e.target.value as any }))}>
                  <option value="recurring">Monthly Recurring</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Price (IDR) *</label>
                <input type="number" className="form-input" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="coming_soon">Coming Soon</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Features (one per line)</label>
                <textarea className="form-input" rows={5} value={featuresInput} onChange={e => setFeaturesInput(e.target.value)} placeholder="Automated receipt delivery&#10;Low stock notifications&#10;Marketing campaigns" style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setModalOpen(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={submitting || !form.name || !form.slug || !form.price}>
                {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteConfirm.open}
        title="Hapus Add-on"
        description={`Hapus add-on "${deleteConfirm.addOn?.name}"? Member yang menggunakan add-on ini mungkin kehilangan akses.`}
        confirmLabel="Hapus Add-on"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm({ open: false, addOn: null })}
      />
    </div>
  );
}
