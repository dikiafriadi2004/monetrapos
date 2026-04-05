"use client";

import { useState, useEffect } from 'react';
import { Percent, Tag, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { taxesService, Tax } from '@/services/taxes.service';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Modal, DeleteModal, PageHeader, EmptyState, LoadingSpinner } from '@/components/ui';

interface Discount {
  id: string; name: string; type: 'percentage' | 'fixed'; value: number;
  minOrder?: number; code?: string; isActive: boolean;
}

export default function TaxesDiscountsPage() {
  const { company } = useAuth();
  const { storeId } = useStore();
  const [activeTab, setActiveTab] = useState<'taxes' | 'discounts'>('taxes');
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);

  const [taxModal, setTaxModal] = useState<{ open: boolean; editing: Tax | null }>({ open: false, editing: null });
  const [taxForm, setTaxForm] = useState({ name: '', rate: '', type: 'percentage' });
  const [discountModal, setDiscountModal] = useState<{ open: boolean; editing: Discount | null }>({ open: false, editing: null });
  const [discountForm, setDiscountForm] = useState({ name: '', type: 'percentage', value: '', code: '', minOrder: '' });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: 'tax' | 'discount'; id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [taxData, discountData]: any = await Promise.all([
        taxesService.getAll(storeId || undefined),
        apiClient.get('/discounts').then((r: any) => Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []).catch(() => []),
      ]);
      setTaxes(taxData);
      setDiscounts(discountData);
    } catch (err) {
      console.error('Failed to fetch:', err);
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxForm.name || !taxForm.rate) return;
    setSubmitting(true);
    try {
      const payload = { name: taxForm.name, rate: parseFloat(taxForm.rate), type: taxForm.type, isActive: true };
      if (taxModal.editing) await taxesService.update(taxModal.editing.id, payload);
      else await taxesService.create(payload);
      toast.success(taxModal.editing ? 'Tax updated' : 'Tax created');
      await fetchData();
      setTaxModal({ open: false, editing: null });
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to save tax'); }
    finally { setSubmitting(false); }
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountForm.name || !discountForm.value) return;
    setSubmitting(true);
    try {
      const payload = { name: discountForm.name, type: discountForm.type, value: parseFloat(discountForm.value), code: discountForm.code || undefined, minOrder: discountForm.minOrder ? parseFloat(discountForm.minOrder) : undefined, isActive: true };
      if (discountModal.editing) await apiClient.patch(`/discounts/${discountModal.editing.id}`, payload);
      else await apiClient.post('/discounts', payload);
      toast.success(discountModal.editing ? 'Discount updated' : 'Discount created');
      await fetchData();
      setDiscountModal({ open: false, editing: null });
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to save discount'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      if (deleteModal.type === 'tax') await taxesService.delete(deleteModal.id);
      else await apiClient.delete(`/discounts/${deleteModal.id}`);
      toast.success('Deleted');
      await fetchData();
      setDeleteModal(null);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to delete'); }
    finally { setDeleting(false); }
  };

  const handleToggleTax = async (tax: Tax) => {
    try {
      await taxesService.toggle(tax.id, !tax.isActive);
      setTaxes(prev => prev.map(t => t.id === tax.id ? { ...t, isActive: !t.isActive } : t));
    } catch (err: any) { toast.error('Failed to update tax'); }
  };

  const handleToggleDiscount = async (d: Discount) => {
    try {
      await apiClient.patch(`/discounts/${d.id}`, { isActive: !d.isActive });
      setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, isActive: !x.isActive } : x));
    } catch (err: any) { toast.error('Failed to update discount'); }
  };

  const openTaxModal = (tax?: Tax) => {
    setTaxModal({ open: true, editing: tax || null });
    setTaxForm(tax ? { name: tax.name, rate: String(tax.rate), type: tax.type || 'percentage' } : { name: '', rate: '', type: 'percentage' });
  };

  const openDiscountModal = (d?: Discount) => {
    setDiscountModal({ open: true, editing: d || null });
    setDiscountForm(d ? { name: d.name, type: d.type, value: String(d.value), code: d.code || '', minOrder: d.minOrder ? String(d.minOrder) : '' } : { name: '', type: 'percentage', value: '', code: '', minOrder: '' });
  };

  return (
    <div>
      <PageHeader
        title="Taxes & Discounts"
        description="Configure tax rates and discount offers"
        action={
          <div className="flex gap-2">
            <button onClick={() => openTaxModal()} className="btn btn-outline btn-sm"><Percent size={14} /> New Tax</button>
            <button onClick={() => openDiscountModal()} className="btn btn-primary btn-sm"><Tag size={14} /> New Discount</button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['taxes', 'discounts'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'taxes' ? `Tax Rates (${taxes.length})` : `Discounts (${discounts.length})`}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          {activeTab === 'taxes' && (
            taxes.length === 0 ? <EmptyState icon={Percent} title="No tax rates configured" action={<button onClick={() => openTaxModal()} className="btn btn-outline btn-sm">Add First Tax</button>} /> : (
              <div className="table-container border-0">
                <table className="table">
                  <thead><tr><th>Tax Name</th><th>Rate</th><th>Type</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                  <tbody>
                    {taxes.map(tax => (
                      <tr key={tax.id}>
                        <td className="font-medium">{tax.name}</td>
                        <td><span className="font-bold text-amber-600">{tax.rate}%</span></td>
                        <td><span className="badge badge-gray capitalize">{tax.type || 'Percentage'}</span></td>
                        <td>
                          <button onClick={() => handleToggleTax(tax)} className={`text-sm ${tax.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {tax.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          </button>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openTaxModal(tax)} className="btn btn-ghost btn-icon btn-sm"><Edit size={14} /></button>
                            <button onClick={() => setDeleteModal({ open: true, type: 'tax', id: tax.id, name: tax.name })} className="btn btn-ghost btn-icon btn-sm text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'discounts' && (
            discounts.length === 0 ? <EmptyState icon={Tag} title="No discounts configured" action={<button onClick={() => openDiscountModal()} className="btn btn-outline btn-sm">Create First Discount</button>} /> : (
              <div className="table-container border-0">
                <table className="table">
                  <thead><tr><th>Discount Name</th><th>Value</th><th>Code</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                  <tbody>
                    {discounts.map(d => (
                      <tr key={d.id}>
                        <td className="font-medium">{d.name}</td>
                        <td><span className="font-bold text-emerald-600">{d.type === 'percentage' ? `${d.value}%` : `Rp ${(d.value||0).toLocaleString('id-ID')}`}</span></td>
                        <td>{d.code ? <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{d.code}</span> : <span className="text-gray-400">—</span>}</td>
                        <td>
                          <button onClick={() => handleToggleDiscount(d)} className={`text-sm ${d.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {d.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          </button>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openDiscountModal(d)} className="btn btn-ghost btn-icon btn-sm"><Edit size={14} /></button>
                            <button onClick={() => setDeleteModal({ open: true, type: 'discount', id: d.id, name: d.name })} className="btn btn-ghost btn-icon btn-sm text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* Tax Modal */}
      <Modal open={taxModal.open} onClose={() => setTaxModal({ open: false, editing: null })} title={taxModal.editing ? 'Edit Tax' : 'New Tax Rate'}
        footer={<><button onClick={() => setTaxModal({ open: false, editing: null })} className="btn btn-outline">Cancel</button><button form="tax-form" type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <Loader2 size={14} className="animate-spin"/> : null}{taxModal.editing ? 'Update' : 'Create'}</button></>}>
        <form id="tax-form" onSubmit={handleSaveTax} className="space-y-4">
          <div className="form-group"><label className="form-label">Tax Name *</label><input className="form-input" placeholder="e.g. PPN, PB1" value={taxForm.name} onChange={e => setTaxForm(p=>({...p,name:e.target.value}))} required /></div>
          <div className="form-group"><label className="form-label">Rate (%) *</label><input className="form-input" type="number" step="0.1" placeholder="11" value={taxForm.rate} onChange={e => setTaxForm(p=>({...p,rate:e.target.value}))} required /></div>
          <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={taxForm.type} onChange={e => setTaxForm(p=>({...p,type:e.target.value}))}><option value="percentage">Percentage</option><option value="inclusive">Inclusive</option><option value="exclusive">Exclusive</option></select></div>
        </form>
      </Modal>

      {/* Discount Modal */}
      <Modal open={discountModal.open} onClose={() => setDiscountModal({ open: false, editing: null })} title={discountModal.editing ? 'Edit Discount' : 'New Discount'}
        footer={<><button onClick={() => setDiscountModal({ open: false, editing: null })} className="btn btn-outline">Cancel</button><button form="discount-form" type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <Loader2 size={14} className="animate-spin"/> : null}{discountModal.editing ? 'Update' : 'Create'}</button></>}>
        <form id="discount-form" onSubmit={handleSaveDiscount} className="space-y-4">
          <div className="form-group"><label className="form-label">Discount Name *</label><input className="form-input" placeholder="e.g. Happy Hour" value={discountForm.name} onChange={e => setDiscountForm(p=>({...p,name:e.target.value}))} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={discountForm.type} onChange={e => setDiscountForm(p=>({...p,type:e.target.value}))}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount (Rp)</option></select></div>
            <div className="form-group"><label className="form-label">Value *</label><input className="form-input" type="number" value={discountForm.value} onChange={e => setDiscountForm(p=>({...p,value:e.target.value}))} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group"><label className="form-label">Voucher Code</label><input className="form-input" placeholder="SAVE10" value={discountForm.code} onChange={e => setDiscountForm(p=>({...p,code:e.target.value.toUpperCase()}))} /></div>
            <div className="form-group"><label className="form-label">Min. Order (Rp)</label><input className="form-input" type="number" placeholder="50000" value={discountForm.minOrder} onChange={e => setDiscountForm(p=>({...p,minOrder:e.target.value}))} /></div>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <DeleteModal open={!!deleteModal?.open} onClose={() => setDeleteModal(null)} onConfirm={handleDelete} loading={deleting}
        title={`Delete ${deleteModal?.type === 'tax' ? 'Tax' : 'Discount'}`} description={`Delete "${deleteModal?.name}"? This cannot be undone.`} />
    </div>
  );
}
