'use client';

import { useState, useEffect } from 'react';
import { suppliersService, Supplier, CreateSupplierDto, UpdateSupplierDto } from '@/services/suppliers.service';
import { Building2, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, User, FileText, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit'; supplier: Supplier | null }>({ open: false, mode: 'create', supplier: null });
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  useEffect(() => { load(); }, [searchTerm, showActiveOnly]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await suppliersService.getAll({ search: searchTerm || undefined, active: showActiveOnly || undefined });
      setSuppliers(res.data);
    } catch { toast.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Delete ${s.name}?`)) return;
    try {
      await suppliersService.delete(s.id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (s: Supplier) => {
    try {
      s.isActive ? await suppliersService.deactivate(s.id) : await suppliersService.activate(s.id);
      toast.success(`${s.isActive ? 'Deactivated' : 'Activated'}`);
      load();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>Suppliers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your suppliers and vendors</p>
        </div>
        <button onClick={() => setModal({ open: true, mode: 'create', supplier: null })} className="btn btn-primary">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search suppliers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <button onClick={() => setShowActiveOnly(!showActiveOnly)} className={`btn ${showActiveOnly ? 'btn-primary' : 'btn-outline'}`}>
          {showActiveOnly ? 'Active Only' : 'All Suppliers'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
          <Building2 size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>{searchTerm ? 'No suppliers match your search' : 'No suppliers yet'}</p>
          {!searchTerm && <button onClick={() => setModal({ open: true, mode: 'create', supplier: null })} className="btn btn-primary"><Plus size={16} /> Add Supplier</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
          {suppliers.map(s => (
            <div key={s.id} className="glass-panel animate-fade-in" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{s.code}</div>
                </div>
                <button onClick={() => handleToggle(s)} style={{ padding: '3px 10px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600, background: s.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: s.isActive ? 'var(--success)' : '#6b7280', border: 'none', cursor: 'pointer' }}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {s.contactPerson && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={14} />{s.contactPerson}</div>}
                {s.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={14} />{s.phone}</div>}
                {s.email && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={14} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</span></div>}
                {s.city && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={14} />{s.city}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)' }}>
                <button onClick={() => setDetailSupplier(s)} className="btn btn-outline" style={{ flex: 1, height: 32, fontSize: '0.8rem' }}>View Details</button>
                <button onClick={() => setModal({ open: true, mode: 'edit', supplier: s })} style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: '0 10px', color: 'var(--primary)' }}><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(s)} style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: '0 10px', color: 'var(--danger)' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <SupplierFormModal mode={modal.mode} supplier={modal.supplier}
          onClose={() => setModal({ open: false, mode: 'create', supplier: null })}
          onSuccess={() => { setModal({ open: false, mode: 'create', supplier: null }); load(); }} />
      )}
      {detailSupplier && (
        <SupplierDetailsModal supplier={detailSupplier}
          onClose={() => setDetailSupplier(null)}
          onEdit={() => { setDetailSupplier(null); setModal({ open: true, mode: 'edit', supplier: detailSupplier }); }} />
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

function SupplierFormModal({ mode, supplier, onClose, onSuccess }: { mode: 'create' | 'edit'; supplier: Supplier | null; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: supplier?.name || '', code: supplier?.code || '', contactPerson: supplier?.contactPerson || '',
    email: supplier?.email || '', phone: supplier?.phone || '', address: supplier?.address || '',
    city: supplier?.city || '', province: supplier?.province || '', postalCode: supplier?.postalCode || '',
    country: supplier?.country || 'Indonesia', taxId: supplier?.taxId || '',
    paymentTerms: supplier?.paymentTerms || '', notes: supplier?.notes || '',
  });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error('Name and code are required'); return; }
    setLoading(true);
    try {
      mode === 'create' ? await suppliersService.create(form as CreateSupplierDto) : await suppliersService.update(supplier!.id, form as UpdateSupplierDto);
      toast.success(mode === 'create' ? 'Supplier created' : 'Supplier updated');
      onSuccess();
    } catch (err: any) { toast.error(err?.message || 'Failed to save'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 600, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 101 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1.1rem' }}>{mode === 'create' ? 'Add Supplier' : 'Edit Supplier'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Code *</label><input className="form-input" value={form.code} onChange={e => f('code', e.target.value)} required disabled={mode === 'edit'} /></div>
            <div className="form-group"><label className="form-label">Contact Person</label><input className="form-input" value={form.contactPerson} onChange={e => f('contactPerson', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e => f('email', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Address</label><textarea className="form-input" rows={2} value={form.address} onChange={e => f('address', e.target.value)} style={{ resize: 'vertical' }} /></div>
            <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city} onChange={e => f('city', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Province</label><input className="form-input" value={form.province} onChange={e => f('province', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Postal Code</label><input className="form-input" value={form.postalCode} onChange={e => f('postalCode', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Country</label><input className="form-input" value={form.country} onChange={e => f('country', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Tax ID / NPWP</label><input className="form-input" value={form.taxId} onChange={e => f('taxId', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Payment Terms</label><input className="form-input" value={form.paymentTerms} onChange={e => f('paymentTerms', e.target.value)} placeholder="e.g. Net 30" /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="form-input" rows={3} value={form.notes} onChange={e => f('notes', e.target.value)} style={{ resize: 'vertical' }} /></div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SupplierDetailsModal({ supplier: s, onClose, onEdit }: { supplier: Supplier; onClose: () => void; onEdit: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="glass-panel animate-fade-in" style={{ position: 'relative', width: 560, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', padding: 'var(--space-xl)', zIndex: 101 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Supplier Details</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{s.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{s.code}</div>
          </div>
          <span style={{ padding: '4px 12px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, background: s.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: s.isActive ? 'var(--success)' : '#6b7280' }}>
            {s.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 'var(--space-lg)', fontSize: '0.9rem' }}>
          {s.contactPerson && <div style={{ display: 'flex', gap: 10 }}><User size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }} />{s.contactPerson}</div>}
          {s.phone && <div style={{ display: 'flex', gap: 10 }}><Phone size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }} />{s.phone}</div>}
          {s.email && <div style={{ display: 'flex', gap: 10 }}><Mail size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }} />{s.email}</div>}
          {(s.address || s.city) && (
            <div style={{ display: 'flex', gap: 10 }}>
              <MapPin size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }} />
              <div>
                {s.address && <div>{s.address}</div>}
                {s.city && <div>{s.city}{s.province ? `, ${s.province}` : ''}{s.postalCode ? ` ${s.postalCode}` : ''}</div>}
                {s.country && <div>{s.country}</div>}
              </div>
            </div>
          )}
          {s.taxId && <div style={{ display: 'flex', gap: 10 }}><FileText size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }} />Tax ID: {s.taxId}</div>}
          {s.paymentTerms && <div style={{ display: 'flex', gap: 10 }}><FileText size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }} />Terms: {s.paymentTerms}</div>}
          {s.notes && <div style={{ display: 'flex', gap: 10 }}><FileText size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }} /><span style={{ whiteSpace: 'pre-wrap' }}>{s.notes}</span></div>}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={onClose} className="btn btn-outline">Close</button>
          <button onClick={onEdit} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Edit2 size={14} /> Edit</button>
        </div>
      </div>
    </div>
  );
}
