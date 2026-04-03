"use client";

import { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit, Trash2, X, Users, Crown, Zap, Star, CheckCircle } from 'lucide-react';
import { api } from '../../../lib/api';

interface Feature {
  id: string;
  name: string;
  code: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  maxOutlets: number;
  maxProducts: number;
  sortOrder: number;
  isActive: boolean;
  features: Feature[];
  subscriptions?: any[];
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', price: '', durationDays: '30',
    maxOutlets: '1', maxProducts: '50', sortOrder: '0', featureIds: [] as string[]
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [plansData, featuresData]: any = await Promise.all([
        api.get('/subscription-plans'),
        api.get('/features')
      ]);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setFeatures(Array.isArray(featuresData) ? featuresData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const formatCurrency = (amount: number) => `Rp ${(amount || 0).toLocaleString('id-ID')}`;

  const openNewModal = () => {
    setEditingPlan(null);
    setForm({ name: '', description: '', price: '', durationDays: '30', maxOutlets: '1', maxProducts: '50', sortOrder: '0', featureIds: [] });
    setModalOpen(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: String(plan.price),
      durationDays: String(plan.durationDays),
      maxOutlets: String(plan.maxOutlets),
      maxProducts: String(plan.maxProducts),
      sortOrder: String(plan.sortOrder),
      featureIds: plan.features?.map(f => f.id) || []
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        durationDays: parseInt(form.durationDays) || 30,
        maxOutlets: parseInt(form.maxOutlets) || 1,
        maxProducts: parseInt(form.maxProducts) || 50,
        sortOrder: parseInt(form.sortOrder) || 0,
        featureIds: form.featureIds,
        isActive: true
      };
      if (editingPlan) {
        await api.patch(`/subscription-plans/${editingPlan.id}`, payload);
      } else {
        await api.post('/subscription-plans', payload);
      }
      await fetchData();
      setModalOpen(false);
    } catch (err) {
      alert('Failed to save plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subscription plan? Active subscribers will not be affected.')) return;
    try {
      await api.delete(`/subscription-plans/${id}`);
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('Failed to delete plan');
    }
  };

  const toggleFeature = (featureId: string) => {
    setForm(prev => ({
      ...prev,
      featureIds: prev.featureIds.includes(featureId)
        ? prev.featureIds.filter(id => id !== featureId)
        : [...prev.featureIds, featureId]
    }));
  };

  const planColors = ['var(--text-tertiary)', 'var(--accent-base)', 'var(--warning)', '#ec4899'];
  const planIcons = [CreditCard, Star, Crown, Zap];

  const totalSubscribers = plans.reduce((s, p) => s + (p.subscriptions?.length || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Subscription Plans</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Create billing tiers, bundle features, and manage member subscriptions.</p>
        </div>
        <button onClick={openNewModal} className="btn btn-primary">
          <Plus size={18} /> Create Plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid-cols-3" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
            <CreditCard size={18} />
          </div>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '2px' }}>{plans.length}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Total Plans</p>
        </div>
        <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
            <Users size={18} />
          </div>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '2px' }}>{totalSubscribers}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Active Subscribers</p>
        </div>
        <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
            <Zap size={18} />
          </div>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '2px' }}>{features.length}</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Available Features</p>
        </div>
      </div>

      {/* Plans */}
      {loading ? (
        <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading plans...</div>
      ) : plans.length === 0 ? (
        <div className="glass-panel flex-center" style={{ height: '350px', flexDirection: 'column' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
            <CreditCard size={32} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>No plans created</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center', margin: '0 auto var(--space-lg)' }}>
            Create your first subscription plan (e.g., Free, Pro, Enterprise) to allow members to start managing their business.
          </p>
          <button onClick={openNewModal} className="btn btn-outline">Setup First Plan</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`, gap: 'var(--space-lg)' }}>
          {plans.sort((a, b) => a.sortOrder - b.sortOrder).map((plan, index) => {
            const accent = planColors[index % planColors.length];
            const Icon = planIcons[index % planIcons.length];
            const subCount = plan.subscriptions?.length || 0;
            const isFree = plan.price === 0 || plan.price === null;

            return (
              <div key={plan.id} className="glass-panel animate-fade-in" style={{ padding: 0, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Plan Header */}
                <div style={{ padding: 'var(--space-xl) var(--space-lg) var(--space-lg)', background: `linear-gradient(135deg, ${accent}08, ${accent}15)`, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: `${accent}20`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={22} />
                    </div>
                    <span className="badge" style={{ background: plan.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: plan.isActive ? 'var(--success)' : 'var(--danger)' }}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-xs)' }}>{plan.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: accent }}>{isFree ? 'Free' : formatCurrency(plan.price)}</span>
                    {!isFree && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>/{plan.durationDays} hari</span>}
                  </div>
                </div>

                {/* Plan Body */}
                <div style={{ padding: 'var(--space-lg)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {plan.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>{plan.description}</p>
                  )}

                  {/* Limits */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--space-md)' }}>
                    <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Max Outlets</span>
                      <span style={{ fontWeight: 600 }}>{plan.maxOutlets === 999 ? 'Unlimited' : plan.maxOutlets}</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Max Products</span>
                      <span style={{ fontWeight: 600 }}>{plan.maxProducts === 999 ? 'Unlimited' : plan.maxProducts}</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Subscribers</span>
                      <span style={{ fontWeight: 600, color: 'var(--success)' }}>{subCount}</span>
                    </div>
                  </div>

                  {/* Features */}
                  {plan.features && plan.features.length > 0 && (
                    <div style={{ flex: 1, marginBottom: 'var(--space-md)' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '8px', letterSpacing: '0.05em' }}>Included Features</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {plan.features.map(f => (
                          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                            {f.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'auto' }}>
                    <button onClick={() => openEditModal(plan)} className="btn btn-outline" style={{ flex: 1, height: '36px', fontSize: '0.85rem' }}>
                      <Edit size={14} /> Edit Plan
                    </button>
                    <button onClick={() => handleDelete(plan.id)} className="btn btn-outline" style={{ height: '36px', padding: '0 12px', color: 'var(--danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: '580px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 101 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: '1.25rem' }}>{editingPlan ? 'Edit Plan' : 'Create Subscription Plan'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">Plan Name *</label>
              <input className="form-input" placeholder="e.g. Free, Pro, Enterprise" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} placeholder="Brief description of this plan..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Price (Rp) *</label>
                <input className="form-input" type="number" placeholder="199000" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (Days)</label>
                <input className="form-input" type="number" placeholder="30" value={form.durationDays} onChange={e => setForm(p => ({ ...p, durationDays: e.target.value }))} />
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Max Outlets</label>
                <input className="form-input" type="number" placeholder="1" value={form.maxOutlets} onChange={e => setForm(p => ({ ...p, maxOutlets: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Products</label>
                <input className="form-input" type="number" placeholder="50" value={form.maxProducts} onChange={e => setForm(p => ({ ...p, maxProducts: e.target.value }))} />
              </div>
            </div>

            {/* Feature Selection */}
            {features.length > 0 && (
              <div className="form-group">
                <label className="form-label">Included Features</label>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {features.map(f => (
                    <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', padding: '4px 0', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={form.featureIds.includes(f.id)}
                        onChange={() => toggleFeature(f.id)}
                        style={{ accentColor: 'var(--accent-base)', width: '16px', height: '16px' }}
                      />
                      <span style={{ color: form.featureIds.includes(f.id) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{f.name}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{f.code}</span>
                    </label>
                  ))}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{form.featureIds.length} features selected</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setModalOpen(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={submitting || !form.name || !form.price}>
                {submitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
