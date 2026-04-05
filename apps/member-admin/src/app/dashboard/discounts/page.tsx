'use client';

import { useState, useEffect } from 'react';
import { discountsService, Discount, DiscountType, CreateDiscountDto } from '@/services/discounts.service';
import { Tag, Plus, Search, Edit2, Trash2, Loader2, X, Percent, DollarSign, Gift, CheckCircle, BarChart2, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, DeleteModal, PageHeader, SearchInput, StatusBadge, EmptyState, LoadingSpinner } from '@/components/ui';

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  [DiscountType.PERCENTAGE]:  { icon: Percent,    label: 'Percentage',  color: 'text-indigo-600 bg-indigo-50' },
  [DiscountType.FIXED_AMOUNT]:{ icon: DollarSign, label: 'Fixed Amount',color: 'text-emerald-600 bg-emerald-50' },
  [DiscountType.BUY_X_GET_Y]: { icon: Gift,       label: 'Buy X Get Y', color: 'text-amber-600 bg-amber-50' },
};

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [formModal, setFormModal] = useState<{ open: boolean; mode: 'create' | 'edit'; discount: Discount | null }>({ open: false, mode: 'create', discount: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; discount: Discount | null }>({ open: false, discount: null });
  const [deleting, setDeleting] = useState(false);
  const [statsModal, setStatsModal] = useState<{ open: boolean; discount: Discount | null; stats: any }>({ open: false, discount: null, stats: null });
  const [validateCode, setValidateCode] = useState('');
  const [validateAmount, setValidateAmount] = useState('');
  const [validateResult, setValidateResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => { load(); }, [activeOnly]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await discountsService.getAll({ isActive: activeOnly || undefined });
      setDiscounts(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load discounts'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteModal.discount) return;
    setDeleting(true);
    try {
      await discountsService.delete(deleteModal.discount.id);
      toast.success('Discount deleted');
      setDeleteModal({ open: false, discount: null });
      load();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const handleValidate = async () => {
    if (!validateCode || !validateAmount) { toast.error('Enter promo code and amount'); return; }
    setValidating(true);
    try {
      const result = await discountsService.validatePromoCode(validateCode, Number(validateAmount));
      setValidateResult(result);
    } catch (err: any) {
      setValidateResult({ valid: false, message: err?.response?.data?.message || 'Invalid promo code' });
    } finally { setValidating(false); }
  };

  const handleViewStats = async (d: Discount) => {
    try {
      const stats = await discountsService.getUsageStats(d.id);
      setStatsModal({ open: true, discount: d, stats });
    } catch { toast.error('Failed to load stats'); }
  };

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const filtered = discounts.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.promoCode || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Discounts & Promotions"
        description="Manage discount codes and promotional offers"
        action={
          <button onClick={() => setFormModal({ open: true, mode: 'create', discount: null })} className="btn btn-primary">
            <Plus size={16} /> Create Discount
          </button>
        }
      />

      {/* Validate Promo */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-700">Validate Promo Code</h3>
        </div>
        <div className="card-body">
          <div className="flex flex-wrap gap-3 items-center">
            <input className="form-input w-44" placeholder="Promo code..." value={validateCode} onChange={e => setValidateCode(e.target.value)} />
            <input type="number" className="form-input w-44" placeholder="Purchase amount..." value={validateAmount} onChange={e => setValidateAmount(e.target.value)} />
            <button onClick={handleValidate} disabled={validating} className="btn btn-primary">
              {validating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Validate
            </button>
            {validateResult && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${validateResult.valid !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {validateResult.valid !== false ? '✓' : '✗'} {validateResult.message || (validateResult.valid !== false ? `Discount: ${validateResult.discountAmount ? fmt(validateResult.discountAmount) : 'Valid'}` : 'Invalid')}
                <button onClick={() => setValidateResult(null)} className="ml-1 opacity-60 hover:opacity-100"><X size={12} /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search discounts..." className="flex-1 min-w-[200px]" />
        <button onClick={() => setActiveOnly(!activeOnly)} className={`btn ${activeOnly ? 'btn-primary' : 'btn-outline'}`}>
          {activeOnly ? 'Active Only' : 'All Discounts'}
        </button>
        <button onClick={load} className="btn btn-outline"><RefreshCcw size={14} /></button>
      </div>

      {/* Grid */}
      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={Tag} title="No discounts found" description="Create your first discount to get started."
          action={<button onClick={() => setFormModal({ open: true, mode: 'create', discount: null })} className="btn btn-primary"><Plus size={16} /> Create Discount</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => {
            const cfg = TYPE_CONFIG[d.discountType] || TYPE_CONFIG[DiscountType.PERCENTAGE];
            const Icon = cfg.icon;
            return (
              <div key={d.id} className="card hover:shadow-md transition-shadow animate-fade-in">
                <div className="card-body">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{d.name}</p>
                        {d.promoCode && <p className="text-xs font-mono text-indigo-600 mt-0.5">{d.promoCode}</p>}
                      </div>
                    </div>
                    <span className={`badge ${d.isActive ? 'badge-success' : 'badge-gray'}`}>{d.isActive ? 'Active' : 'Inactive'}</span>
                  </div>

                  <div className="space-y-1.5 text-sm mb-4">
                    {[
                      ['Type', d.discountType.replace('_', ' ')],
                      ['Value', d.discountType === DiscountType.PERCENTAGE ? `${d.value}%` : fmt(d.value)],
                      ['Usage', `${d.usageCount} / ${d.usageLimit || '∞'}`],
                      ['Valid Until', new Date(d.endDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-medium text-gray-800 capitalize">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button onClick={() => setFormModal({ open: true, mode: 'edit', discount: d })} className="btn btn-outline btn-sm flex-1">
                      <Edit2 size={13} /> Edit
                    </button>
                    <button onClick={() => handleViewStats(d)} className="btn btn-outline btn-sm btn-icon" title="Stats">
                      <BarChart2 size={14} />
                    </button>
                    <button onClick={() => setDeleteModal({ open: true, discount: d })} className="btn btn-outline btn-sm btn-icon text-red-500 hover:text-red-600" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Modal */}
      <Modal open={statsModal.open} onClose={() => setStatsModal({ open: false, discount: null, stats: null })} title={`Stats: ${statsModal.discount?.name}`} size="sm">
        {statsModal.stats && (
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Total Usage', statsModal.stats?.totalUsage ?? statsModal.discount?.usageCount ?? 0, 'text-indigo-600'],
              ['Discount Given', fmt(statsModal.stats?.totalDiscountGiven || 0), 'text-emerald-600'],
              ['Revenue', fmt(statsModal.stats?.totalRevenue || 0), 'text-amber-600'],
              ['Usage Rate', statsModal.discount?.usageLimit ? `${Math.round((statsModal.discount.usageCount / statsModal.discount.usageLimit) * 100)}%` : '—', 'text-blue-600'],
            ].map(([label, value, color]) => (
              <div key={label as string} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, discount: null })}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Discount"
        description={`Delete "${deleteModal.discount?.name}"? This cannot be undone.`}
      />

      {/* Form Modal */}
      {formModal.open && (
        <DiscountFormModal
          mode={formModal.mode}
          discount={formModal.discount}
          onClose={() => setFormModal({ open: false, mode: 'create', discount: null })}
          onSuccess={() => { setFormModal({ open: false, mode: 'create', discount: null }); load(); }}
        />
      )}
    </div>
  );
}

function DiscountFormModal({ mode, discount, onClose, onSuccess }: {
  mode: 'create' | 'edit'; discount: Discount | null; onClose: () => void; onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: discount?.name || '',
    description: discount?.description || '',
    discountType: discount?.discountType || DiscountType.PERCENTAGE,
    value: discount?.value || 0,
    promoCode: discount?.promoCode || '',
    minPurchaseAmount: discount?.minPurchaseAmount || 0,
    maxDiscountAmount: discount?.maxDiscountAmount || 0,
    startDate: discount?.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    endDate: discount?.endDate?.split('T')[0] || '',
    usageLimit: discount?.usageLimit || 0,
  });

  const f = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  const generateCode = async () => {
    try {
      const code = await discountsService.generatePromoCode('PROMO', 8);
      f('promoCode', code);
      toast.success('Code generated');
    } catch { toast.error('Failed to generate code'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value) { toast.error('Name and value are required'); return; }
    setLoading(true);
    try {
      if (mode === 'create') {
        await discountsService.create(form as CreateDiscountDto);
        toast.success('Discount created');
      } else if (discount) {
        await discountsService.update(discount.id, form);
        toast.success('Discount updated');
      }
      onSuccess();
    } catch { toast.error('Failed to save discount'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open title={mode === 'create' ? 'Create Discount' : 'Edit Discount'} onClose={onClose} size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
          <button form="discount-form" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {mode === 'create' ? 'Create' : 'Update'}
          </button>
        </>
      }>
      <form id="discount-form" onSubmit={handleSubmit} className="space-y-4">0 
        <div className="form-group">
          <label className="form-label">Discount Name *</label>
          <input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={2} value={form.description} onChange={e => f('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Discount Type *</label>
            <select className="form-input" value={form.discountType} onChange={e => f('discountType', e.target.value)}>
              <option value={DiscountType.PERCENTAGE}>Percentage</option>
              <option value={DiscountType.FIXED_AMOUNT}>Fixed Amount</option>
              <option value={DiscountType.BUY_X_GET_Y}>Buy X Get Y</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Value *</label>
            <input type="number" className="form-input" value={form.value} onChange={e => f('value', Number(e.target.value))} required />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Promo Code</label>
          <div className="flex gap-2">
            <input className="form-input flex-1" value={form.promoCode} onChange={e => f('promoCode', e.target.value)} />
            <button type="button" onClick={generateCode} className="btn btn-outline">Generate</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Min Purchase (IDR)</label>
            <input type="number" className="form-input" value={form.minPurchaseAmount} onChange={e => f('minPurchaseAmount', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Max Discount (IDR)</label>
            <input type="number" className="form-input" value={form.maxDiscountAmount} onChange={e => f('maxDiscountAmount', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Start Date *</label>
            <input type="date" className="form-input" value={form.startDate} onChange={e => f('startDate', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">End Date *</label>
            <input type="date" className="form-input" value={form.endDate} onChange={e => f('endDate', e.target.value)} required />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Usage Limit (0 = unlimited)</label>
          <input type="number" className="form-input" value={form.usageLimit} onChange={e => f('usageLimit', Number(e.target.value))} />
        </div>
      </form>
    </Modal>
  );
}
