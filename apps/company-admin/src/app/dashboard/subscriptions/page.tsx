"use client";

import { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit, Trash2, X, Users, Crown, Zap, Star, CheckCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../components/ConfirmModal';

// Features is Record<string, boolean> in the API
interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  trialDays: number;
  maxStores: number;
  maxUsers: number;
  maxProducts: number;
  maxTransactionsPerMonth: number;
  sortOrder: number;
  isActive: boolean;
  isPopular: boolean;
  features: Record<string, boolean>;
  subscriptions?: any[];
  durations?: any[];
}

const FEATURE_LABELS: Record<string, string> = {
  // Core POS
  pos: 'Point of Sale (POS)',
  pos_terminal: 'POS Terminal',
  inventory: 'Manajemen Inventori',
  customers: 'Manajemen Pelanggan',
  employees: 'Manajemen Karyawan',
  reports: 'Laporan & Analitik',
  receipt_printing: 'Cetak Struk',
  // Advanced
  multiStore: 'Multi-Outlet',
  multi_store: 'Multi-Outlet',
  loyaltyProgram: 'Program Loyalitas',
  customer_loyalty: 'Program Loyalitas',
  api: 'Akses API',
  api_access: 'Akses API',
  customReceipt: 'Custom Struk',
  custom_receipt: 'Custom Struk',
  // Support
  prioritySupport: 'Priority Support',
  priority_support: 'Priority Support',
  dedicated_manager: 'Dedicated Manager',
  phone_support: 'Support Telepon',
  email_support: 'Support Email',
  // Enterprise
  whiteLabel: 'White Label',
  white_label: 'White Label',
  custom_domain: 'Custom Domain',
  custom_integrations: 'Integrasi Custom',
  mobile_app: 'Aplikasi Mobile',
  // Modules
  fnb: 'Modul F&B',
  laundry: 'Modul Laundry',
  kds: 'Kitchen Display (KDS)',
  online_ordering: 'Pemesanan Online',
  delivery_management: 'Manajemen Pengiriman',
  purchase_orders: 'Purchase Order',
  audit: 'Audit Logs',
};

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState({
    name: '', slug: '', description: '',
    priceMonthly: '', priceYearly: '',
    maxStores: '1', maxProducts: '100', maxUsers: '5',
    sortOrder: '0', isPopular: false,
    features: {} as Record<string, boolean>,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const plansData: any = await api.get('/subscription-plans/with-durations');
      setPlans(Array.isArray(plansData) ? plansData : (plansData?.data || []));
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
    setForm({
      name: '', slug: '', description: '',
      priceMonthly: '', priceYearly: '',
      maxStores: '1', maxProducts: '100', maxUsers: '5',
      sortOrder: '0', isPopular: false,
      features: {},
    });
    setModalOpen(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      slug: plan.slug || '',
      description: plan.description || '',
      priceMonthly: String(plan.priceMonthly || 0),
      priceYearly: String(plan.priceYearly || 0),
      maxStores: String(plan.maxStores || 1),
      maxProducts: String(plan.maxProducts || 100),
      maxUsers: String(plan.maxUsers || 5),
      sortOrder: String(plan.sortOrder || 0),
      isPopular: plan.isPopular || false,
      features: typeof plan.features === 'object' && !Array.isArray(plan.features)
        ? plan.features
        : {},
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.priceMonthly) return;
    setSubmitting(true);
    try {
      const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const payload = {
        name: form.name,
        slug,
        description: form.description,
        priceMonthly: parseFloat(form.priceMonthly) || 0,
        priceYearly: parseFloat(form.priceYearly) || parseFloat(form.priceMonthly) * 10,
        maxStores: parseInt(form.maxStores) || 1,
        maxProducts: parseInt(form.maxProducts) || 100,
        maxUsers: parseInt(form.maxUsers) || 5,
        sortOrder: parseInt(form.sortOrder) || 0,
        isPopular: form.isPopular,
        features: form.features,
        isActive: true,
      };
      if (editingPlan) {
        await api.put(`/subscription-plans/${editingPlan.id}`, payload);
        // Regenerate duration options with new price
        await Promise.allSettled([1, 3, 6, 12].map(months =>
          api.post(`/subscription-plans/${editingPlan.id}/durations`, { durationMonths: months })
        ));
        toast.success('Plan updated');
      } else {
        const res: any = await api.post('/subscription-plans', payload);
        const planId = res?.id || res?.data?.id;
        // Auto-generate duration options (1, 3, 6, 12 months)
        if (planId) {
          await Promise.allSettled([1, 3, 6, 12].map(months =>
            api.post(`/subscription-plans/${planId}/durations`, { durationMonths: months })
          ));
        }
        toast.success('Plan created');
      }
      await fetchData();
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/subscription-plans/${deleteConfirm.id}`);
      setPlans(prev => prev.filter(p => p.id !== deleteConfirm.id));
      toast.success('Plan deleted');
      setDeleteConfirm({ open: false, id: '', name: '' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete plan');
    } finally {
      setDeleting(false);
    }
  };

  const toggleFeature = (key: string) => {
    setForm(prev => ({
      ...prev,
      features: { ...prev.features, [key]: !prev.features[key] },
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
          <p style={{ color: 'var(--text-secondary)' }}>Create billing tiers and manage member subscriptions.</p>
        </div>
        <button onClick={openNewModal} className="btn btn-primary">
          <Plus size={18} /> Create Plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid-cols-3" style={{ marginBottom: 'var(--space-xl)' }}>
        {[
          { icon: CreditCard, label: 'Total Plans', value: plans.length, color: 'rgba(99,102,241,0.15)', iconColor: 'var(--accent-base)' },
          { icon: Users, label: 'Active Subscribers', value: totalSubscribers, color: 'rgba(16,185,129,0.15)', iconColor: 'var(--success)' },
          { icon: Zap, label: 'Active Plans', value: plans.filter(p => p.isActive).length, color: 'rgba(245,158,11,0.15)', iconColor: 'var(--warning)' },
        ].map((s, i) => (
          <div key={i} className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: s.color, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
              <s.icon size={18} />
            </div>
            <h3 style={{ fontSize: '1.75rem', marginBottom: '2px' }}>{s.value}</h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Plans */}
      {loading ? (
        <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading plans...</div>
      ) : plans.length === 0 ? (
        <div className="glass-panel flex-center" style={{ height: '350px', flexDirection: 'column' }}>
          <CreditCard size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>No plans yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>Create your first subscription plan to get started.</p>
          <button onClick={openNewModal} className="btn btn-outline">Create First Plan</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`, gap: 'var(--space-lg)' }}>
          {plans.sort((a, b) => a.sortOrder - b.sortOrder).map((plan, index) => {
            const accent = planColors[index % planColors.length];
            const Icon = planIcons[index % planIcons.length];
            const enabledFeatures = Object.entries(plan.features || {}).filter(([, v]) => v);

            return (
              <div key={plan.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: 'var(--space-xl) var(--space-lg) var(--space-lg)', background: `linear-gradient(135deg, ${accent}08, ${accent}15)`, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: `${accent}20`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={22} />
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {plan.isPopular && <span className="badge badge-primary">Popular</span>}
                      <span className="badge" style={{ background: plan.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: plan.isActive ? 'var(--success)' : 'var(--danger)' }}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-xs)' }}>{plan.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 700, color: accent }}>{formatCurrency(plan.priceMonthly)}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>/bulan</span>
                  </div>
                  {plan.priceYearly > 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>{formatCurrency(plan.priceYearly)}/tahun</p>
                  )}

                  {/* Duration pricing */}
                  {Array.isArray(plan.durations) && plan.durations.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {[...plan.durations].sort((a: any, b: any) => a.durationMonths - b.durationMonths).map((d: any) => (
                        <span key={d.durationMonths} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: `${accent}15`, color: accent, fontWeight: 600 }}>
                          {d.durationMonths}bln {d.discountPercentage > 0 ? `(-${d.discountPercentage}%)` : ''}
                        </span>
                      ))}
                    </div>
                  )}                </div>

                <div style={{ padding: 'var(--space-lg)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {plan.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>{plan.description}</p>}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: 'var(--space-md)', fontSize: '0.85rem' }}>
                    {[
                      ['Max Stores', plan.maxStores],
                      ['Max Products', plan.maxProducts],
                      ['Max Users', plan.maxUsers],
                      ['Trial Days', plan.trialDays],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex-between">
                        <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                        <span style={{ fontWeight: 600 }}>{(val as number) === -1 ? '∞ Unlimited' : val}</span>
                      </div>
                    ))}
                  </div>

                  {enabledFeatures.length > 0 && (
                    <div style={{ flex: 1, marginBottom: 'var(--space-md)' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '6px' }}>Features</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {enabledFeatures.map(([key]) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <CheckCircle size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
                            {FEATURE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'auto' }}>
                    <button onClick={() => openEditModal(plan)} className="btn btn-outline" style={{ flex: 1, height: '36px', fontSize: '0.85rem' }}>
                      <Edit size={14} /> Edit
                    </button>
                    <button onClick={() => setDeleteConfirm({ open: true, id: plan.id, name: plan.name })} className="btn btn-outline" style={{ height: '36px', padding: '0 12px', color: 'var(--danger)' }}>
                      <Trash2 size={14} />
                    </button>                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="glass-panel" style={{ position: 'relative', width: '560px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 9001 }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: '1.25rem' }}>{editingPlan ? 'Edit Plan' : 'Create Plan'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Plan Name *</label>
                <input className="form-input" placeholder="e.g. Starter, Pro" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Slug</label>
                <input className="form-input" placeholder="auto-generated" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Monthly Price (Rp) *</label>
                <input className="form-input" type="number" placeholder="199000" value={form.priceMonthly} onChange={e => setForm(p => ({ ...p, priceMonthly: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Yearly Price (Rp)</label>
                <input className="form-input" type="number" placeholder="1990000" value={form.priceYearly} onChange={e => setForm(p => ({ ...p, priceYearly: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Stores</label>
                <input className="form-input" type="number" value={form.maxStores} onChange={e => setForm(p => ({ ...p, maxStores: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Products</label>
                <input className="form-input" type="number" value={form.maxProducts} onChange={e => setForm(p => ({ ...p, maxProducts: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Users</label>
                <input className="form-input" type="number" value={form.maxUsers} onChange={e => setForm(p => ({ ...p, maxUsers: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Sort Order</label>
                <input className="form-input" type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Features</label>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {/* Merge FEATURE_LABELS keys with any extra keys already in the plan */}
                {Array.from(new Set([
                  ...Object.keys(FEATURE_LABELS),
                  ...Object.keys(form.features),
                ])).map((key) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={!!form.features[key]} onChange={() => toggleFeature(key)} style={{ accentColor: 'var(--accent-base)' }} />
                    {FEATURE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={form.isPopular} onChange={e => setForm(p => ({ ...p, isPopular: e.target.checked }))} style={{ accentColor: 'var(--accent-base)' }} />
                Mark as Popular Plan
              </label>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
              <button onClick={() => setModalOpen(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={submitting || !form.name || !form.priceMonthly}>
                {submitting ? 'Saving...' : editingPlan ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={deleteConfirm.open}
        title="Hapus Subscription Plan"
        description={`Apakah Anda yakin ingin menghapus plan "${deleteConfirm.name}"? Subscriber aktif tidak akan terpengaruh, namun plan ini tidak bisa dipilih lagi.`}
        confirmLabel="Hapus Plan"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm({ open: false, id: '', name: '' })}
      />
    </div>
  );
}

